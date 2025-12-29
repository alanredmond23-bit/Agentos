/**
 * AgentOS Studio - Schema Validator
 * JSON Schema validation using AJV with detailed error reporting
 */

import Ajv, { ErrorObject, Schema } from 'ajv';
import type {
  AgentYAML,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationInfo,
  RiskLevel,
  ToolType,
  TriggerType,
  OutputType,
  ErrorAction,
  LogLevel,
} from '@/types/studio';

// ============================================
// JSON Schemas
// ============================================

const modelConfigSchema: Schema = {
  type: 'object',
  required: ['provider', 'name', 'temperature', 'max_tokens'],
  properties: {
    provider: {
      type: 'string',
      enum: ['anthropic', 'openai', 'google', 'local'],
    },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    temperature: { type: 'number', minimum: 0, maximum: 2 },
    max_tokens: { type: 'integer', minimum: 1, maximum: 200000 },
    top_p: { type: 'number', minimum: 0, maximum: 1 },
    top_k: { type: 'integer', minimum: 1 },
    stop_sequences: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 10,
    },
  },
  additionalProperties: false,
};

const toolParameterSchema: Schema = {
  type: 'object',
  required: ['name', 'type', 'description', 'required'],
  properties: {
    name: { type: 'string', pattern: '^[a-z_][a-z0-9_]*$' },
    type: {
      type: 'string',
      enum: ['string', 'number', 'boolean', 'array', 'object', 'file', 'date'],
    },
    description: { type: 'string', maxLength: 500 },
    required: { type: 'boolean' },
    default_value: {},
    validation: {
      type: 'object',
      properties: {
        pattern: { type: 'string' },
        min: { type: 'number' },
        max: { type: 'number' },
        min_length: { type: 'integer', minimum: 0 },
        max_length: { type: 'integer', minimum: 0 },
        enum: { type: 'array' },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

const toolConfigSchema: Schema = {
  type: 'object',
  required: ['name', 'type', 'description', 'enabled', 'requires_approval', 'risk_level'],
  properties: {
    name: { type: 'string', pattern: '^[a-z_][a-z0-9_]*$', maxLength: 50 },
    type: {
      type: 'string',
      enum: ['mcp', 'function', 'api', 'shell', 'file', 'database', 'browser', 'custom'],
    },
    description: { type: 'string', maxLength: 500 },
    enabled: { type: 'boolean' },
    requires_approval: { type: 'boolean' },
    risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    parameters: {
      type: 'array',
      items: toolParameterSchema,
    },
    timeout_ms: { type: 'integer', minimum: 100, maximum: 600000 },
    retry_policy: {
      type: 'object',
      properties: {
        max_retries: { type: 'integer', minimum: 0, maximum: 10 },
        initial_delay_ms: { type: 'integer', minimum: 100 },
        max_delay_ms: { type: 'integer', minimum: 100 },
        backoff_multiplier: { type: 'number', minimum: 1 },
        retry_on_errors: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

const capabilityConfigSchema: Schema = {
  type: 'object',
  required: ['name', 'description', 'enabled', 'requires_approval', 'risk_level', 'allowed_actions'],
  properties: {
    name: { type: 'string', pattern: '^[a-z_][a-z0-9_]*$', maxLength: 50 },
    description: { type: 'string', maxLength: 500 },
    enabled: { type: 'boolean' },
    requires_approval: { type: 'boolean' },
    risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    allowed_actions: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
    },
  },
  additionalProperties: false,
};

const triggerConfigSchema: Schema = {
  type: 'object',
  required: ['type', 'name', 'enabled', 'config'],
  properties: {
    type: {
      type: 'string',
      enum: ['manual', 'schedule', 'webhook', 'event', 'file_watch', 'api'],
    },
    name: { type: 'string', maxLength: 50 },
    enabled: { type: 'boolean' },
    config: { type: 'object' },
    conditions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['field', 'operator', 'value'],
        properties: {
          field: { type: 'string' },
          operator: {
            type: 'string',
            enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'matches'],
          },
          value: {},
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

const outputConfigSchema: Schema = {
  type: 'object',
  required: ['name', 'type', 'format'],
  properties: {
    name: { type: 'string', pattern: '^[a-z_][a-z0-9_]*$', maxLength: 50 },
    type: {
      type: 'string',
      enum: ['text', 'json', 'file', 'database', 'api', 'notification', 'artifact'],
    },
    format: { type: 'string', maxLength: 100 },
    destination: { type: 'string', maxLength: 500 },
    template: { type: 'string', maxLength: 10000 },
  },
  additionalProperties: false,
};

const errorHandlingSchema: Schema = {
  type: 'object',
  required: ['on_error', 'max_retries', 'notify_on_failure', 'log_level'],
  properties: {
    on_error: {
      type: 'string',
      enum: ['stop', 'retry', 'fallback', 'skip', 'escalate'],
    },
    max_retries: { type: 'integer', minimum: 0, maximum: 10 },
    fallback_agent: { type: 'string' },
    notify_on_failure: { type: 'boolean' },
    log_level: {
      type: 'string',
      enum: ['debug', 'info', 'warn', 'error'],
    },
  },
  additionalProperties: false,
};

const rateLimitSchema: Schema = {
  type: 'object',
  required: [
    'requests_per_minute',
    'requests_per_hour',
    'requests_per_day',
    'tokens_per_minute',
    'tokens_per_day',
    'concurrent_executions',
  ],
  properties: {
    requests_per_minute: { type: 'integer', minimum: 1, maximum: 10000 },
    requests_per_hour: { type: 'integer', minimum: 1, maximum: 100000 },
    requests_per_day: { type: 'integer', minimum: 1, maximum: 1000000 },
    tokens_per_minute: { type: 'integer', minimum: 1000, maximum: 10000000 },
    tokens_per_day: { type: 'integer', minimum: 10000, maximum: 100000000 },
    concurrent_executions: { type: 'integer', minimum: 1, maximum: 100 },
  },
  additionalProperties: false,
};

const approvalConfigSchema: Schema = {
  type: 'object',
  required: ['enabled', 'auto_approve_threshold', 'require_approval_for', 'timeout_minutes'],
  properties: {
    enabled: { type: 'boolean' },
    auto_approve_threshold: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'critical'],
    },
    require_approval_for: {
      type: 'array',
      items: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    },
    timeout_minutes: { type: 'integer', minimum: 1, maximum: 10080 },
    escalation_path: {
      type: 'array',
      items: { type: 'string' },
    },
    notify_channels: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  additionalProperties: false,
};

const metadataConfigSchema: Schema = {
  type: 'object',
  required: ['author', 'tags'],
  properties: {
    author: { type: 'string', maxLength: 100 },
    tags: {
      type: 'array',
      items: { type: 'string', pattern: '^[a-z0-9-]+$', maxLength: 30 },
      maxItems: 20,
    },
    documentation: { type: 'string', maxLength: 50000 },
    examples: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'description', 'input', 'expected_output'],
        properties: {
          name: { type: 'string', maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          input: { type: 'string', maxLength: 10000 },
          expected_output: { type: 'string', maxLength: 10000 },
        },
        additionalProperties: false,
      },
    },
    changelog: {
      type: 'array',
      items: {
        type: 'object',
        required: ['version', 'date', 'changes'],
        properties: {
          version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+' },
          date: { type: 'string', format: 'date' },
          changes: {
            type: 'array',
            items: { type: 'string', maxLength: 500 },
          },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

const agentYAMLSchema: Schema = {
  type: 'object',
  required: [
    'name',
    'slug',
    'description',
    'version',
    'model',
    'system_prompt',
    'tools',
    'capabilities',
    'triggers',
    'outputs',
    'error_handling',
    'rate_limiting',
    'approval',
    'metadata',
  ],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    slug: { type: 'string', pattern: '^[a-z][a-z0-9-]*$', minLength: 2, maxLength: 50 },
    description: { type: 'string', minLength: 1, maxLength: 1000 },
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+' },
    model: modelConfigSchema,
    system_prompt: { type: 'string', minLength: 10, maxLength: 100000 },
    tools: {
      type: 'array',
      items: toolConfigSchema,
    },
    capabilities: {
      type: 'array',
      items: capabilityConfigSchema,
      minItems: 1,
    },
    triggers: {
      type: 'array',
      items: triggerConfigSchema,
      minItems: 1,
    },
    outputs: {
      type: 'array',
      items: outputConfigSchema,
      minItems: 1,
    },
    error_handling: errorHandlingSchema,
    rate_limiting: rateLimitSchema,
    approval: approvalConfigSchema,
    metadata: metadataConfigSchema,
  },
  additionalProperties: false,
};

// ============================================
// Validator Class
// ============================================

class SchemaValidator {
  private ajv: Ajv;
  private agentValidator: ReturnType<Ajv['compile']>;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
      validateFormats: false, // Set to false since ajv-formats is optional
    });

    // Add basic format validators manually
    this.ajv.addFormat('date', {
      type: 'string',
      validate: (x: string) => /^\d{4}-\d{2}-\d{2}$/.test(x),
    });

    this.ajv.addFormat('date-time', {
      type: 'string',
      validate: (x: string) => !isNaN(Date.parse(x)),
    });

    this.ajv.addFormat('uri', {
      type: 'string',
      validate: (x: string) => {
        try {
          new URL(x);
          return true;
        } catch {
          return false;
        }
      },
    });

    this.ajv.addFormat('email', {
      type: 'string',
      validate: (x: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x),
    });

    this.agentValidator = this.ajv.compile(agentYAMLSchema);
  }

  // ============================================
  // Validation Methods
  // ============================================

  async validateAgentYAML(data: Partial<AgentYAML>): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    const isValid = this.agentValidator(data);

    if (!isValid && this.agentValidator.errors) {
      this.agentValidator.errors.forEach((error) => {
        errors.push(this.formatError(error));
      });
    }

    // Additional semantic validation
    this.validateSemantics(data, warnings, info);

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      info,
      validated_at: new Date().toISOString(),
    };
  }

  validate<T>(data: T, schema: Schema): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    const validate = this.ajv.compile(schema);
    const isValid = validate(data);

    if (!isValid && validate.errors) {
      validate.errors.forEach((error) => {
        errors.push(this.formatError(error));
      });
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      info,
      validated_at: new Date().toISOString(),
    };
  }

  // ============================================
  // Error Formatting
  // ============================================

  private formatError(error: ErrorObject): ValidationError {
    const path = error.instancePath || '/';
    let message = this.formatErrorMessage(error);

    return {
      code: `SCHEMA_${error.keyword.toUpperCase()}`,
      message,
      path,
      severity: 'error',
      suggestion: this.getSuggestion(error),
    };
  }

  private formatErrorMessage(error: ErrorObject): string {
    switch (error.keyword) {
      case 'required':
        return `Missing required field: ${error.params.missingProperty}`;
      case 'type':
        return `Expected ${error.params.type}, but got ${typeof error.data}`;
      case 'enum':
        return `Value must be one of: ${error.params.allowedValues.join(', ')}`;
      case 'pattern':
        return `Value does not match pattern: ${error.params.pattern}`;
      case 'minLength':
        return `Value must be at least ${error.params.limit} characters`;
      case 'maxLength':
        return `Value must be at most ${error.params.limit} characters`;
      case 'minimum':
        return `Value must be >= ${error.params.limit}`;
      case 'maximum':
        return `Value must be <= ${error.params.limit}`;
      case 'additionalProperties':
        return `Unknown property: ${error.params.additionalProperty}`;
      case 'format':
        return `Invalid format, expected ${error.params.format}`;
      default:
        return error.message || 'Validation error';
    }
  }

  private getSuggestion(error: ErrorObject): string | undefined {
    switch (error.keyword) {
      case 'pattern':
        if (error.params.pattern === '^[a-z][a-z0-9-]*$') {
          return 'Use lowercase letters, numbers, and hyphens only. Must start with a letter.';
        }
        if (error.params.pattern === '^[a-z_][a-z0-9_]*$') {
          return 'Use lowercase letters, numbers, and underscores only. Must start with a letter or underscore.';
        }
        break;
      case 'enum':
        return `Valid values are: ${error.params.allowedValues.join(', ')}`;
      case 'required':
        return `Add the "${error.params.missingProperty}" field to your configuration`;
      case 'minimum':
      case 'maximum':
        return `Adjust the value to be within the allowed range`;
    }
    return undefined;
  }

  // ============================================
  // Semantic Validation
  // ============================================

  private validateSemantics(
    data: Partial<AgentYAML>,
    warnings: ValidationWarning[],
    info: ValidationInfo[]
  ): void {
    // Check for high-risk tools without approval
    if (data.tools) {
      data.tools.forEach((tool, index) => {
        if (
          (tool.risk_level === 'high' || tool.risk_level === 'critical') &&
          !tool.requires_approval
        ) {
          warnings.push({
            code: 'SEMANTIC_HIGH_RISK_NO_APPROVAL',
            message: `Tool "${tool.name}" has ${tool.risk_level} risk but doesn't require approval`,
            path: `/tools/${index}`,
            severity: 'warning',
            suggestion: 'Consider enabling requires_approval for high-risk tools',
          });
        }
      });
    }

    // Check for disabled approval with high-risk capabilities
    if (data.approval && !data.approval.enabled && data.capabilities) {
      const hasHighRisk = data.capabilities.some(
        (c) => c.risk_level === 'high' || c.risk_level === 'critical'
      );
      if (hasHighRisk) {
        warnings.push({
          code: 'SEMANTIC_APPROVAL_DISABLED',
          message: 'Approval is disabled but agent has high-risk capabilities',
          path: '/approval',
          severity: 'warning',
          suggestion: 'Consider enabling approval for agents with high-risk capabilities',
        });
      }
    }

    // Check for high rate limits
    if (data.rate_limiting) {
      if (data.rate_limiting.requests_per_minute > 500) {
        info.push({
          code: 'SEMANTIC_HIGH_RATE_LIMIT',
          message: 'Agent has a high requests_per_minute limit (>500)',
          path: '/rate_limiting/requests_per_minute',
          severity: 'info',
        });
      }
    }

    // Check for long system prompts
    if (data.system_prompt && data.system_prompt.length > 10000) {
      warnings.push({
        code: 'SEMANTIC_LONG_PROMPT',
        message: `System prompt is very long (${data.system_prompt.length} chars). Consider breaking it down.`,
        path: '/system_prompt',
        severity: 'warning',
      });
    }

    // Check for shell/database tools
    if (data.tools) {
      const dangerousTools = data.tools.filter(
        (t) => t.type === 'shell' || t.type === 'database'
      );
      if (dangerousTools.length > 0) {
        info.push({
          code: 'SEMANTIC_DANGEROUS_TOOLS',
          message: `Agent uses potentially dangerous tool types: ${dangerousTools.map((t) => t.type).join(', ')}`,
          path: '/tools',
          severity: 'info',
        });
      }
    }

    // Check for proper error handling
    if (data.error_handling?.on_error === 'skip' && data.error_handling.notify_on_failure === false) {
      warnings.push({
        code: 'SEMANTIC_SILENT_FAILURES',
        message: 'Errors are skipped without notification, failures may go unnoticed',
        path: '/error_handling',
        severity: 'warning',
        suggestion: 'Enable notify_on_failure or change on_error behavior',
      });
    }
  }

  // ============================================
  // Schema Export
  // ============================================

  getAgentSchema(): Schema {
    return agentYAMLSchema;
  }

  getModelConfigSchema(): Schema {
    return modelConfigSchema;
  }

  getToolConfigSchema(): Schema {
    return toolConfigSchema;
  }
}

// Export singleton instance
export const schemaValidator = new SchemaValidator();
export type { SchemaValidator };
