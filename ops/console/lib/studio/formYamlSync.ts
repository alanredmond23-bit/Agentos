/**
 * AgentOS Studio - Form/YAML Bidirectional Sync
 * Real-time synchronization between form state and YAML representation
 */

import YAML from 'yaml';
import { debounce } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface AgentFormData {
  id?: string;
  name: string;
  slug: string;
  description: string;
  pack: string;
  version: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  tools: ToolConfig[];
  capabilities: CapabilityConfig[];
  rateLimit: RateLimitConfig;
  retryPolicy: RetryPolicyConfig;
  autoApproveThreshold: number;
  environmentVariables: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface ToolConfig {
  id: string;
  name: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface CapabilityConfig {
  id: string;
  name: string;
  description: string;
  requiresApproval: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

export interface RetryPolicyConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface ValidationError {
  path: string;
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface SyncState {
  formData: AgentFormData;
  yamlContent: string;
  jsonOutput: string;
  lastSource: 'form' | 'yaml' | 'none';
  isDirty: boolean;
  isSyncing: boolean;
  hasConflict: boolean;
  validation: ValidationResult;
  lastSyncTimestamp: number;
}

export interface SyncConflict {
  formValue: unknown;
  yamlValue: unknown;
  path: string;
  timestamp: number;
}

// ============================================
// Default Values
// ============================================

export const DEFAULT_FORM_DATA: AgentFormData = {
  name: '',
  slug: '',
  description: '',
  pack: 'engineering',
  version: '1.0.0',
  model: 'claude-3-opus-20240229',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: '',
  tools: [],
  capabilities: [],
  rateLimit: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
  },
  retryPolicy: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
  autoApproveThreshold: 0.8,
  environmentVariables: {},
  metadata: {},
};

// ============================================
// YAML Schema Configuration
// ============================================

const YAML_PARSE_OPTIONS: YAML.ParseOptions = {
  strict: false,
  prettyErrors: true,
};

const YAML_STRINGIFY_OPTIONS: YAML.DocumentOptions & YAML.SchemaOptions & YAML.ToStringOptions = {
  indent: 2,
  lineWidth: 120,
  defaultKeyType: 'PLAIN',
  defaultStringType: 'QUOTE_DOUBLE',
  nullStr: 'null',
  trueStr: 'true',
  falseStr: 'false',
};

// ============================================
// Form to YAML Conversion
// ============================================

export function formToYaml(formData: AgentFormData): string {
  const yamlStructure = {
    agent: {
      name: formData.name,
      slug: formData.slug || generateSlug(formData.name),
      description: formData.description,
      pack: formData.pack,
      version: formData.version,
    },
    model: {
      name: formData.model,
      temperature: formData.temperature,
      max_tokens: formData.maxTokens,
    },
    system_prompt: formData.systemPrompt,
    tools: formData.tools.length > 0 ? formData.tools.map(tool => ({
      name: tool.name,
      enabled: tool.enabled,
      ...(tool.config && Object.keys(tool.config).length > 0 ? { config: tool.config } : {}),
    })) : undefined,
    capabilities: formData.capabilities.length > 0 ? formData.capabilities.map(cap => ({
      name: cap.name,
      description: cap.description,
      requires_approval: cap.requiresApproval,
      risk_level: cap.riskLevel,
    })) : undefined,
    rate_limit: {
      requests_per_minute: formData.rateLimit.requestsPerMinute,
      requests_per_hour: formData.rateLimit.requestsPerHour,
      requests_per_day: formData.rateLimit.requestsPerDay,
    },
    retry_policy: {
      max_retries: formData.retryPolicy.maxRetries,
      initial_delay_ms: formData.retryPolicy.initialDelayMs,
      max_delay_ms: formData.retryPolicy.maxDelayMs,
      backoff_multiplier: formData.retryPolicy.backoffMultiplier,
    },
    auto_approve_threshold: formData.autoApproveThreshold,
    environment_variables: Object.keys(formData.environmentVariables).length > 0
      ? formData.environmentVariables
      : undefined,
    metadata: formData.metadata && Object.keys(formData.metadata).length > 0
      ? formData.metadata
      : undefined,
  };

  // Remove undefined keys for cleaner output
  const cleanedStructure = removeUndefinedKeys(yamlStructure);

  return YAML.stringify(cleanedStructure, YAML_STRINGIFY_OPTIONS);
}

// ============================================
// YAML to Form Conversion
// ============================================

export function yamlToForm(yamlContent: string): { data: AgentFormData; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  try {
    const parsed = YAML.parse(yamlContent, YAML_PARSE_OPTIONS);

    if (!parsed || typeof parsed !== 'object') {
      return {
        data: DEFAULT_FORM_DATA,
        errors: [{ path: '', message: 'Invalid YAML structure', severity: 'error' }],
      };
    }

    const formData: AgentFormData = {
      id: parsed.agent?.id,
      name: parseString(parsed.agent?.name, 'agent.name', errors) || '',
      slug: parseString(parsed.agent?.slug, 'agent.slug', errors) || '',
      description: parseString(parsed.agent?.description, 'agent.description', errors) || '',
      pack: parseString(parsed.agent?.pack, 'agent.pack', errors) || 'engineering',
      version: parseString(parsed.agent?.version, 'agent.version', errors) || '1.0.0',
      model: parseString(parsed.model?.name, 'model.name', errors) || 'claude-3-opus-20240229',
      temperature: parseNumber(parsed.model?.temperature, 'model.temperature', errors, 0.7),
      maxTokens: parseNumber(parsed.model?.max_tokens, 'model.max_tokens', errors, 4096),
      systemPrompt: parseString(parsed.system_prompt, 'system_prompt', errors) || '',
      tools: parseTools(parsed.tools, errors),
      capabilities: parseCapabilities(parsed.capabilities, errors),
      rateLimit: parseRateLimit(parsed.rate_limit, errors),
      retryPolicy: parseRetryPolicy(parsed.retry_policy, errors),
      autoApproveThreshold: parseNumber(
        parsed.auto_approve_threshold,
        'auto_approve_threshold',
        errors,
        0.8
      ),
      environmentVariables: parseRecord(parsed.environment_variables, 'environment_variables', errors),
      metadata: parsed.metadata || {},
    };

    return { data: formData, errors };
  } catch (err) {
    const yamlError = err as YAML.YAMLParseError;
    const error: ValidationError = {
      path: '',
      message: yamlError.message || 'Failed to parse YAML',
      line: yamlError.linePos?.[0]?.line,
      column: yamlError.linePos?.[0]?.col,
      severity: 'error',
    };
    return { data: DEFAULT_FORM_DATA, errors: [error] };
  }
}

// ============================================
// Form to JSON Conversion (Output Preview)
// ============================================

export function formToJson(formData: AgentFormData): string {
  const jsonOutput = {
    id: formData.id || generateUUID(),
    name: formData.name,
    slug: formData.slug || generateSlug(formData.name),
    description: formData.description,
    pack: formData.pack,
    version: formData.version,
    configuration: {
      model: formData.model,
      temperature: formData.temperature,
      max_tokens: formData.maxTokens,
      tools_enabled: formData.tools.filter(t => t.enabled).map(t => t.name),
      auto_approve_threshold: formData.autoApproveThreshold,
      rate_limit: {
        requests_per_minute: formData.rateLimit.requestsPerMinute,
        requests_per_hour: formData.rateLimit.requestsPerHour,
        requests_per_day: formData.rateLimit.requestsPerDay,
      },
      retry_policy: {
        max_retries: formData.retryPolicy.maxRetries,
        initial_delay_ms: formData.retryPolicy.initialDelayMs,
        max_delay_ms: formData.retryPolicy.maxDelayMs,
        backoff_multiplier: formData.retryPolicy.backoffMultiplier,
      },
      environment_variables: formData.environmentVariables,
    },
    system_prompt: formData.systemPrompt,
    capabilities: formData.capabilities.map(cap => ({
      id: cap.id,
      name: cap.name,
      description: cap.description,
      requires_approval: cap.requiresApproval,
      risk_level: cap.riskLevel,
    })),
    metadata: formData.metadata,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return JSON.stringify(jsonOutput, null, 2);
}

// ============================================
// Validation Functions
// ============================================

export function validateFormData(formData: AgentFormData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required field validation
  if (!formData.name || formData.name.trim() === '') {
    errors.push({ path: 'name', message: 'Agent name is required', severity: 'error' });
  } else if (formData.name.length < 3) {
    warnings.push({ path: 'name', message: 'Agent name should be at least 3 characters', severity: 'warning' });
  }

  if (!formData.slug || formData.slug.trim() === '') {
    warnings.push({ path: 'slug', message: 'Slug will be auto-generated from name', severity: 'warning' });
  } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
    errors.push({ path: 'slug', message: 'Slug must contain only lowercase letters, numbers, and hyphens', severity: 'error' });
  }

  if (!formData.description || formData.description.trim() === '') {
    warnings.push({ path: 'description', message: 'Description is recommended', severity: 'warning' });
  }

  // Model configuration validation
  if (formData.temperature < 0 || formData.temperature > 2) {
    errors.push({ path: 'temperature', message: 'Temperature must be between 0 and 2', severity: 'error' });
  }

  if (formData.maxTokens < 1 || formData.maxTokens > 200000) {
    errors.push({ path: 'maxTokens', message: 'Max tokens must be between 1 and 200000', severity: 'error' });
  }

  // Rate limit validation
  if (formData.rateLimit.requestsPerMinute <= 0) {
    errors.push({ path: 'rateLimit.requestsPerMinute', message: 'Requests per minute must be positive', severity: 'error' });
  }

  if (formData.rateLimit.requestsPerHour <= 0) {
    errors.push({ path: 'rateLimit.requestsPerHour', message: 'Requests per hour must be positive', severity: 'error' });
  }

  if (formData.rateLimit.requestsPerDay <= 0) {
    errors.push({ path: 'rateLimit.requestsPerDay', message: 'Requests per day must be positive', severity: 'error' });
  }

  // Logical rate limit check
  if (formData.rateLimit.requestsPerMinute * 60 > formData.rateLimit.requestsPerHour) {
    warnings.push({
      path: 'rateLimit',
      message: 'Minute rate limit exceeds hourly limit - hourly limit may be hit frequently',
      severity: 'warning',
    });
  }

  // Retry policy validation
  if (formData.retryPolicy.maxRetries < 0 || formData.retryPolicy.maxRetries > 10) {
    errors.push({ path: 'retryPolicy.maxRetries', message: 'Max retries must be between 0 and 10', severity: 'error' });
  }

  if (formData.retryPolicy.backoffMultiplier < 1 || formData.retryPolicy.backoffMultiplier > 5) {
    warnings.push({ path: 'retryPolicy.backoffMultiplier', message: 'Backoff multiplier should be between 1 and 5', severity: 'warning' });
  }

  // Auto-approve threshold validation
  if (formData.autoApproveThreshold < 0 || formData.autoApproveThreshold > 1) {
    errors.push({ path: 'autoApproveThreshold', message: 'Auto-approve threshold must be between 0 and 1', severity: 'error' });
  }

  // Capability validation
  const highRiskWithoutApproval = formData.capabilities.filter(
    cap => (cap.riskLevel === 'high' || cap.riskLevel === 'critical') && !cap.requiresApproval
  );
  if (highRiskWithoutApproval.length > 0) {
    warnings.push({
      path: 'capabilities',
      message: `${highRiskWithoutApproval.length} high-risk capabilities without approval requirement`,
      severity: 'warning',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateYamlSyntax(yamlContent: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!yamlContent || yamlContent.trim() === '') {
    return { isValid: false, errors: [{ path: '', message: 'YAML content is empty', severity: 'error' }], warnings };
  }

  try {
    const doc = YAML.parseDocument(yamlContent, YAML_PARSE_OPTIONS);

    // Collect YAML parsing errors
    for (const error of doc.errors) {
      errors.push({
        path: '',
        message: error.message,
        line: error.linePos?.[0]?.line,
        column: error.linePos?.[0]?.col,
        severity: 'error',
      });
    }

    // Collect YAML warnings
    for (const warning of doc.warnings) {
      warnings.push({
        path: '',
        message: warning.message,
        line: warning.linePos?.[0]?.line,
        column: warning.linePos?.[0]?.col,
        severity: 'warning',
      });
    }

    if (errors.length === 0) {
      // Additional semantic validation
      const { data, errors: parseErrors } = yamlToForm(yamlContent);
      errors.push(...parseErrors);

      // Validate the parsed form data
      const formValidation = validateFormData(data);
      errors.push(...formValidation.errors);
      warnings.push(...formValidation.warnings);
    }
  } catch (err) {
    const yamlError = err as YAML.YAMLParseError;
    errors.push({
      path: '',
      message: yamlError.message || 'Failed to parse YAML',
      line: yamlError.linePos?.[0]?.line,
      column: yamlError.linePos?.[0]?.col,
      severity: 'error',
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

// ============================================
// Conflict Detection
// ============================================

export function detectConflicts(
  formData: AgentFormData,
  yamlContent: string
): SyncConflict[] {
  const conflicts: SyncConflict[] = [];

  try {
    const { data: yamlFormData } = yamlToForm(yamlContent);
    const formYaml = formToYaml(formData);
    const { data: normalizedFormData } = yamlToForm(formYaml);

    // Compare key fields
    const fieldsToCompare: (keyof AgentFormData)[] = [
      'name', 'slug', 'description', 'pack', 'version',
      'model', 'temperature', 'maxTokens', 'systemPrompt',
      'autoApproveThreshold',
    ];

    for (const field of fieldsToCompare) {
      const formValue = normalizedFormData[field];
      const yamlValue = yamlFormData[field];

      if (JSON.stringify(formValue) !== JSON.stringify(yamlValue)) {
        conflicts.push({
          path: field,
          formValue,
          yamlValue,
          timestamp: Date.now(),
        });
      }
    }
  } catch {
    // If we can't parse, we can't detect conflicts
  }

  return conflicts;
}

// ============================================
// Sync Manager Class
// ============================================

export type SyncCallback = (state: SyncState) => void;

export class FormYamlSyncManager {
  private state: SyncState;
  private subscribers: Set<SyncCallback> = new Set();
  private debouncedFormSync: ReturnType<typeof debounce>;
  private debouncedYamlSync: ReturnType<typeof debounce>;
  private syncVersion: number = 0;

  constructor(initialData?: Partial<AgentFormData>, debounceMs: number = 300) {
    this.state = {
      formData: { ...DEFAULT_FORM_DATA, ...initialData },
      yamlContent: '',
      jsonOutput: '',
      lastSource: 'none',
      isDirty: false,
      isSyncing: false,
      hasConflict: false,
      validation: { isValid: true, errors: [], warnings: [] },
      lastSyncTimestamp: Date.now(),
    };

    // Initialize YAML from form data
    this.state.yamlContent = formToYaml(this.state.formData);
    this.state.jsonOutput = formToJson(this.state.formData);

    // Create debounced sync functions
    this.debouncedFormSync = debounce(this.syncFromForm.bind(this), debounceMs);
    this.debouncedYamlSync = debounce(this.syncFromYaml.bind(this), debounceMs);
  }

  subscribe(callback: SyncCallback): () => void {
    this.subscribers.add(callback);
    callback(this.state);
    return () => this.subscribers.delete(callback);
  }

  private notify(): void {
    for (const callback of this.subscribers) {
      callback(this.state);
    }
  }

  getState(): SyncState {
    return { ...this.state };
  }

  updateForm(updates: Partial<AgentFormData>, immediate: boolean = false): void {
    const currentVersion = ++this.syncVersion;

    this.state = {
      ...this.state,
      formData: { ...this.state.formData, ...updates },
      lastSource: 'form',
      isDirty: true,
      isSyncing: true,
    };

    this.notify();

    if (immediate) {
      this.syncFromForm(currentVersion);
    } else {
      this.debouncedFormSync(currentVersion);
    }
  }

  updateYaml(yamlContent: string, immediate: boolean = false): void {
    const currentVersion = ++this.syncVersion;

    this.state = {
      ...this.state,
      yamlContent,
      lastSource: 'yaml',
      isDirty: true,
      isSyncing: true,
    };

    this.notify();

    if (immediate) {
      this.syncFromYaml(currentVersion);
    } else {
      this.debouncedYamlSync(currentVersion);
    }
  }

  private syncFromForm(version: number): void {
    // Skip if a newer version has been triggered
    if (version !== this.syncVersion) return;

    const yamlContent = formToYaml(this.state.formData);
    const jsonOutput = formToJson(this.state.formData);
    const validation = validateFormData(this.state.formData);

    this.state = {
      ...this.state,
      yamlContent,
      jsonOutput,
      validation,
      isSyncing: false,
      hasConflict: false,
      lastSyncTimestamp: Date.now(),
    };

    this.notify();
  }

  private syncFromYaml(version: number): void {
    // Skip if a newer version has been triggered
    if (version !== this.syncVersion) return;

    const syntaxValidation = validateYamlSyntax(this.state.yamlContent);

    if (syntaxValidation.isValid) {
      const { data, errors } = yamlToForm(this.state.yamlContent);
      const jsonOutput = formToJson(data);
      const formValidation = validateFormData(data);

      this.state = {
        ...this.state,
        formData: data,
        jsonOutput,
        validation: {
          isValid: formValidation.isValid && errors.length === 0,
          errors: [...errors, ...formValidation.errors],
          warnings: formValidation.warnings,
        },
        isSyncing: false,
        hasConflict: false,
        lastSyncTimestamp: Date.now(),
      };
    } else {
      this.state = {
        ...this.state,
        validation: syntaxValidation,
        isSyncing: false,
        hasConflict: false,
        lastSyncTimestamp: Date.now(),
      };
    }

    this.notify();
  }

  resolveConflict(useSource: 'form' | 'yaml'): void {
    if (useSource === 'form') {
      this.syncFromForm(++this.syncVersion);
    } else {
      this.syncFromYaml(++this.syncVersion);
    }
    this.state.hasConflict = false;
    this.notify();
  }

  reset(formData?: AgentFormData): void {
    const data = formData || DEFAULT_FORM_DATA;

    this.state = {
      formData: data,
      yamlContent: formToYaml(data),
      jsonOutput: formToJson(data),
      lastSource: 'none',
      isDirty: false,
      isSyncing: false,
      hasConflict: false,
      validation: validateFormData(data),
      lastSyncTimestamp: Date.now(),
    };

    this.notify();
  }

  markClean(): void {
    this.state.isDirty = false;
    this.notify();
  }
}

// ============================================
// Helper Functions
// ============================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function removeUndefinedKeys<T extends object>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result) as (keyof T)[]) {
    if (result[key] === undefined) {
      delete result[key];
    } else if (typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
      result[key] = removeUndefinedKeys(result[key] as object) as T[keyof T];
    }
  }
  return result;
}

function parseString(value: unknown, path: string, errors: ValidationError[]): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  errors.push({ path, message: `Expected string at ${path}`, severity: 'warning' });
  return String(value);
}

function parseNumber(value: unknown, path: string, errors: ValidationError[], defaultValue: number): number {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  errors.push({ path, message: `Expected number at ${path}`, severity: 'warning' });
  return defaultValue;
}

function parseRecord(value: unknown, path: string, errors: ValidationError[]): Record<string, string> {
  if (value === undefined || value === null) return {};
  if (typeof value === 'object' && !Array.isArray(value)) {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = String(v);
    }
    return result;
  }
  errors.push({ path, message: `Expected object at ${path}`, severity: 'warning' });
  return {};
}

function parseTools(value: unknown, errors: ValidationError[]): ToolConfig[] {
  if (!Array.isArray(value)) return [];

  return value.map((tool, index) => {
    if (typeof tool !== 'object' || tool === null) {
      errors.push({ path: `tools[${index}]`, message: 'Invalid tool configuration', severity: 'warning' });
      return { id: generateUUID(), name: 'unknown', enabled: false };
    }

    return {
      id: (tool as Record<string, unknown>).id as string || generateUUID(),
      name: parseString((tool as Record<string, unknown>).name, `tools[${index}].name`, errors) || 'unknown',
      enabled: Boolean((tool as Record<string, unknown>).enabled),
      config: (tool as Record<string, unknown>).config as Record<string, unknown> || undefined,
    };
  });
}

function parseCapabilities(value: unknown, errors: ValidationError[]): CapabilityConfig[] {
  if (!Array.isArray(value)) return [];

  return value.map((cap, index) => {
    if (typeof cap !== 'object' || cap === null) {
      errors.push({ path: `capabilities[${index}]`, message: 'Invalid capability configuration', severity: 'warning' });
      return { id: generateUUID(), name: 'unknown', description: '', requiresApproval: true, riskLevel: 'medium' as const };
    }

    const capObj = cap as Record<string, unknown>;
    const riskLevel = parseString(capObj.risk_level, `capabilities[${index}].risk_level`, errors);
    const validRiskLevels = ['low', 'medium', 'high', 'critical'];

    return {
      id: capObj.id as string || generateUUID(),
      name: parseString(capObj.name, `capabilities[${index}].name`, errors) || 'unknown',
      description: parseString(capObj.description, `capabilities[${index}].description`, errors) || '',
      requiresApproval: Boolean(capObj.requires_approval),
      riskLevel: (validRiskLevels.includes(riskLevel || '') ? riskLevel : 'medium') as CapabilityConfig['riskLevel'],
    };
  });
}

function parseRateLimit(value: unknown, errors: ValidationError[]): RateLimitConfig {
  const defaultRateLimit = DEFAULT_FORM_DATA.rateLimit;

  if (!value || typeof value !== 'object') return defaultRateLimit;

  const obj = value as Record<string, unknown>;
  return {
    requestsPerMinute: parseNumber(obj.requests_per_minute, 'rate_limit.requests_per_minute', errors, defaultRateLimit.requestsPerMinute),
    requestsPerHour: parseNumber(obj.requests_per_hour, 'rate_limit.requests_per_hour', errors, defaultRateLimit.requestsPerHour),
    requestsPerDay: parseNumber(obj.requests_per_day, 'rate_limit.requests_per_day', errors, defaultRateLimit.requestsPerDay),
  };
}

function parseRetryPolicy(value: unknown, errors: ValidationError[]): RetryPolicyConfig {
  const defaultRetryPolicy = DEFAULT_FORM_DATA.retryPolicy;

  if (!value || typeof value !== 'object') return defaultRetryPolicy;

  const obj = value as Record<string, unknown>;
  return {
    maxRetries: parseNumber(obj.max_retries, 'retry_policy.max_retries', errors, defaultRetryPolicy.maxRetries),
    initialDelayMs: parseNumber(obj.initial_delay_ms, 'retry_policy.initial_delay_ms', errors, defaultRetryPolicy.initialDelayMs),
    maxDelayMs: parseNumber(obj.max_delay_ms, 'retry_policy.max_delay_ms', errors, defaultRetryPolicy.maxDelayMs),
    backoffMultiplier: parseNumber(obj.backoff_multiplier, 'retry_policy.backoff_multiplier', errors, defaultRetryPolicy.backoffMultiplier),
  };
}

// ============================================
// React Hook for Sync Manager
// ============================================

import { useEffect, useState, useCallback, useRef } from 'react';

export function useFormYamlSync(initialData?: Partial<AgentFormData>, debounceMs: number = 300) {
  const managerRef = useRef<FormYamlSyncManager | null>(null);
  const [state, setState] = useState<SyncState>(() => {
    const manager = new FormYamlSyncManager(initialData, debounceMs);
    managerRef.current = manager;
    return manager.getState();
  });

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    const unsubscribe = manager.subscribe(setState);
    return unsubscribe;
  }, []);

  const updateForm = useCallback((updates: Partial<AgentFormData>, immediate?: boolean) => {
    managerRef.current?.updateForm(updates, immediate);
  }, []);

  const updateYaml = useCallback((yaml: string, immediate?: boolean) => {
    managerRef.current?.updateYaml(yaml, immediate);
  }, []);

  const resolveConflict = useCallback((source: 'form' | 'yaml') => {
    managerRef.current?.resolveConflict(source);
  }, []);

  const reset = useCallback((formData?: AgentFormData) => {
    managerRef.current?.reset(formData);
  }, []);

  const markClean = useCallback(() => {
    managerRef.current?.markClean();
  }, []);

  return {
    state,
    updateForm,
    updateYaml,
    resolveConflict,
    reset,
    markClean,
  };
}

export default FormYamlSyncManager;
