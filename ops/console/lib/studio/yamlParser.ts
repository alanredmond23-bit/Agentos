/**
 * AgentOS Studio - YAML Parser
 * YAML parsing and stringification with line-level error reporting
 */

import YAML from 'yaml';
import type {
  YAMLParseResult,
  YAMLParseError,
  YAMLParseWarning,
  AgentYAML,
} from '@/types/studio';

// ============================================
// Error Codes
// ============================================

const ERROR_CODES = {
  SYNTAX_ERROR: 'YAML_SYNTAX_ERROR',
  INVALID_STRUCTURE: 'YAML_INVALID_STRUCTURE',
  DUPLICATE_KEY: 'YAML_DUPLICATE_KEY',
  INVALID_INDENTATION: 'YAML_INVALID_INDENTATION',
  INVALID_TYPE: 'YAML_INVALID_TYPE',
  MISSING_REQUIRED: 'YAML_MISSING_REQUIRED',
  UNEXPECTED_TOKEN: 'YAML_UNEXPECTED_TOKEN',
  EMPTY_DOCUMENT: 'YAML_EMPTY_DOCUMENT',
} as const;

const WARNING_CODES = {
  DEPRECATED_FIELD: 'YAML_DEPRECATED_FIELD',
  LONG_LINE: 'YAML_LONG_LINE',
  TRAILING_WHITESPACE: 'YAML_TRAILING_WHITESPACE',
  MISSING_NEWLINE: 'YAML_MISSING_NEWLINE',
  UNCOMMON_PATTERN: 'YAML_UNCOMMON_PATTERN',
} as const;

// ============================================
// Helper Functions
// ============================================

function extractLineSnippet(content: string, line: number, contextLines: number = 1): string {
  const lines = content.split('\n');
  const startLine = Math.max(0, line - contextLines - 1);
  const endLine = Math.min(lines.length, line + contextLines);

  return lines
    .slice(startLine, endLine)
    .map((l, i) => {
      const lineNum = startLine + i + 1;
      const marker = lineNum === line ? '>' : ' ';
      return `${marker} ${lineNum.toString().padStart(4)} | ${l}`;
    })
    .join('\n');
}

function getLineFromOffset(content: string, offset: number): { line: number; column: number } {
  const lines = content.slice(0, offset).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

// ============================================
// YAML Parser Class
// ============================================

class YAMLParser {
  private parseOptions: YAML.ParseOptions & YAML.DocumentOptions & YAML.SchemaOptions;
  private stringifyOptions: YAML.ToStringOptions;

  constructor() {
    this.parseOptions = {
      strict: false,
      prettyErrors: true,
      keepSourceTokens: true,
      logLevel: 'warn',
    };

    this.stringifyOptions = {
      indent: 2,
      lineWidth: 120,
      minContentWidth: 20,
      defaultKeyType: 'PLAIN',
      defaultStringType: 'QUOTE_DOUBLE',
      collectionStyle: 'block',
      nullStr: '~',
    };
  }

  // ============================================
  // Parse Operations
  // ============================================

  parse<T = unknown>(content: string): YAMLParseResult<T> {
    const errors: YAMLParseError[] = [];
    const warnings: YAMLParseWarning[] = [];

    // Check for empty content
    if (!content || content.trim().length === 0) {
      return {
        success: false,
        data: null,
        errors: [
          {
            message: 'YAML document is empty',
            line: 1,
            column: 1,
            code: ERROR_CODES.EMPTY_DOCUMENT,
          },
        ],
        warnings: [],
      };
    }

    // Run pre-parse warnings
    this.checkForWarnings(content, warnings);

    try {
      const doc = YAML.parseDocument(content, this.parseOptions);

      // Collect YAML library errors
      if (doc.errors.length > 0) {
        doc.errors.forEach((err) => {
          const pos = err.pos?.[0] ?? 0;
          const location = getLineFromOffset(content, pos);

          errors.push({
            message: err.message,
            line: location.line,
            column: location.column,
            snippet: extractLineSnippet(content, location.line),
            code: this.mapYAMLErrorCode(err.code),
          });
        });
      }

      // Collect YAML library warnings
      if (doc.warnings.length > 0) {
        doc.warnings.forEach((warn) => {
          const pos = warn.pos?.[0] ?? 0;
          const location = getLineFromOffset(content, pos);

          warnings.push({
            message: warn.message,
            line: location.line,
            column: location.column,
            code: WARNING_CODES.UNCOMMON_PATTERN,
          });
        });
      }

      if (errors.length > 0) {
        return {
          success: false,
          data: null,
          errors,
          warnings,
        };
      }

      const data = doc.toJS() as T;

      return {
        success: true,
        data,
        errors: [],
        warnings,
      };
    } catch (error) {
      const yamlError = error as YAML.YAMLError;
      const pos = yamlError.pos?.[0] ?? 0;
      const location = getLineFromOffset(content, pos);

      return {
        success: false,
        data: null,
        errors: [
          {
            message: yamlError.message || 'Unknown YAML parsing error',
            line: location.line,
            column: location.column,
            snippet: extractLineSnippet(content, location.line),
            code: ERROR_CODES.SYNTAX_ERROR,
          },
        ],
        warnings,
      };
    }
  }

  parseAgentYAML(content: string): YAMLParseResult<AgentYAML> {
    const result = this.parse<Partial<AgentYAML>>(content);

    if (!result.success || !result.data) {
      return result as YAMLParseResult<AgentYAML>;
    }

    // Validate required fields
    const requiredFields = ['name', 'slug', 'description', 'version', 'model', 'system_prompt'];
    const missingFields: string[] = [];

    requiredFields.forEach((field) => {
      if (!(field in result.data!) || result.data![field as keyof AgentYAML] === undefined) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      const fieldLine = this.findFieldLine(content, missingFields[0]);
      result.errors.push({
        message: `Missing required fields: ${missingFields.join(', ')}`,
        line: fieldLine || 1,
        column: 1,
        code: ERROR_CODES.MISSING_REQUIRED,
      });

      return {
        ...result,
        success: false,
      } as YAMLParseResult<AgentYAML>;
    }

    return result as YAMLParseResult<AgentYAML>;
  }

  // ============================================
  // Stringify Operations
  // ============================================

  stringify(data: unknown, options?: Partial<YAML.ToStringOptions>): string {
    try {
      return YAML.stringify(data, {
        ...this.stringifyOptions,
        ...options,
      });
    } catch (error) {
      console.error('[YAMLParser] Stringify error:', error);
      throw new Error(
        `Failed to stringify YAML: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  stringifyAgent(agent: Partial<AgentYAML>): string {
    // Ensure proper field ordering for agent YAML
    const ordered: Record<string, unknown> = {};
    const fieldOrder = [
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
    ];

    fieldOrder.forEach((field) => {
      if (field in agent) {
        ordered[field] = agent[field as keyof AgentYAML];
      }
    });

    // Add any additional fields not in the standard order
    Object.keys(agent).forEach((key) => {
      if (!fieldOrder.includes(key)) {
        ordered[key] = agent[key as keyof AgentYAML];
      }
    });

    return this.stringify(ordered);
  }

  // ============================================
  // Validation Helpers
  // ============================================

  private checkForWarnings(content: string, warnings: YAMLParseWarning[]): void {
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for trailing whitespace
      if (/\s+$/.test(line)) {
        warnings.push({
          message: 'Line has trailing whitespace',
          line: lineNum,
          column: line.trimEnd().length + 1,
          code: WARNING_CODES.TRAILING_WHITESPACE,
        });
      }

      // Check for very long lines
      if (line.length > 200) {
        warnings.push({
          message: `Line exceeds 200 characters (${line.length})`,
          line: lineNum,
          column: 200,
          code: WARNING_CODES.LONG_LINE,
        });
      }
    });

    // Check for missing final newline
    if (content.length > 0 && !content.endsWith('\n')) {
      warnings.push({
        message: 'File should end with a newline',
        line: lines.length,
        column: lines[lines.length - 1].length + 1,
        code: WARNING_CODES.MISSING_NEWLINE,
      });
    }
  }

  private mapYAMLErrorCode(code: string | undefined): string {
    const codeMap: Record<string, string> = {
      DUPLICATE_KEY: ERROR_CODES.DUPLICATE_KEY,
      MISSING_CHAR: ERROR_CODES.SYNTAX_ERROR,
      UNEXPECTED_TOKEN: ERROR_CODES.UNEXPECTED_TOKEN,
      BAD_INDENT: ERROR_CODES.INVALID_INDENTATION,
    };

    return codeMap[code || ''] || ERROR_CODES.SYNTAX_ERROR;
  }

  private findFieldLine(content: string, field: string): number | null {
    const lines = content.split('\n');
    const regex = new RegExp(`^${field}\\s*:`);

    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        return i + 1;
      }
    }

    return null;
  }

  // ============================================
  // Utility Methods
  // ============================================

  isValidYAML(content: string): boolean {
    const result = this.parse(content);
    return result.success;
  }

  format(content: string): { formatted: string; error: string | null } {
    const result = this.parse(content);

    if (!result.success || !result.data) {
      return {
        formatted: content,
        error: result.errors[0]?.message || 'Failed to parse YAML',
      };
    }

    try {
      const formatted = this.stringify(result.data);
      return { formatted, error: null };
    } catch (error) {
      return {
        formatted: content,
        error: error instanceof Error ? error.message : 'Failed to format YAML',
      };
    }
  }

  getFieldAtLine(content: string, line: number): string | null {
    const lines = content.split('\n');
    if (line < 1 || line > lines.length) return null;

    const targetLine = lines[line - 1];
    const match = targetLine.match(/^(\s*)(\w+)\s*:/);

    if (match) {
      return match[2];
    }

    // Look for parent field
    const indent = targetLine.match(/^(\s*)/)?.[1]?.length || 0;
    for (let i = line - 2; i >= 0; i--) {
      const prevLine = lines[i];
      const prevIndent = prevLine.match(/^(\s*)/)?.[1]?.length || 0;
      if (prevIndent < indent) {
        const prevMatch = prevLine.match(/^(\s*)(\w+)\s*:/);
        if (prevMatch) return prevMatch[2];
      }
    }

    return null;
  }

  merge(base: string, overlay: string): { merged: string; error: string | null } {
    const baseResult = this.parse<Record<string, unknown>>(base);
    const overlayResult = this.parse<Record<string, unknown>>(overlay);

    if (!baseResult.success || !baseResult.data) {
      return { merged: base, error: 'Failed to parse base YAML' };
    }

    if (!overlayResult.success || !overlayResult.data) {
      return { merged: base, error: 'Failed to parse overlay YAML' };
    }

    const merged = this.deepMerge(baseResult.data, overlayResult.data);
    return { merged: this.stringify(merged), error: null };
  }

  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    const result = { ...target };

    Object.keys(source).forEach((key) => {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = this.deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else {
        result[key] = sourceValue;
      }
    });

    return result;
  }
}

// Export singleton instance
export const yamlParser = new YAMLParser();
export type { YAMLParser };
