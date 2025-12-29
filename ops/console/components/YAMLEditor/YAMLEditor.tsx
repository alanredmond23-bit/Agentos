/**
 * AgentOS Studio - YAML Editor Component
 * Main editor component combining Monaco, toolbar, and validation panel
 * Features: Full-screen mode, minimap toggle, schema validation, syntax highlighting
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { parse as parseYAML, YAMLParseError } from 'yaml';
import Ajv from 'ajv';

import { MonacoWrapper, type MonacoEditorRef } from './MonacoWrapper';
import { YAMLToolbar } from './YAMLToolbar';
import { YAMLValidation, type ValidationError } from './YAMLValidation';
import { agentYAMLJSONSchema } from '@/lib/studio/yamlSchema';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface YAMLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (errors: ValidationError[]) => void;
  onSave?: () => void;
  readOnly?: boolean;
  className?: string;
  showToolbar?: boolean;
  showValidation?: boolean;
  minHeight?: string;
  maxHeight?: string;
  activeTab?: 'form' | 'yaml';
  onTabChange?: (tab: 'form' | 'yaml') => void;
  agentId?: string;
  agentName?: string;
}

interface EditorState {
  cursorLine: number;
  cursorColumn: number;
  lineCount: number;
  selectedText: string;
}

// ============================================
// AJV Validator Setup
// ============================================

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
  validateFormats: false
});

const validateSchema = ajv.compile(agentYAMLJSONSchema);

// ============================================
// YAML Editor Component
// ============================================

export function YAMLEditor({
  value,
  onChange,
  onValidationChange,
  onSave,
  readOnly = false,
  className,
  showToolbar = true,
  showValidation = true,
  minHeight = '400px',
  maxHeight = '100%',
  activeTab = 'yaml',
  onTabChange,
  agentId,
  agentName
}: YAMLEditorProps) {
  const editorRef = useRef<MonacoEditorRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validationPanelOpen, setValidationPanelOpen] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [minimapEnabled, setMinimapEnabled] = useState(true);
  const [editorState, setEditorState] = useState<EditorState>({
    cursorLine: 1,
    cursorColumn: 1,
    lineCount: 1,
    selectedText: ''
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Detect system theme
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to exit fullscreen
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
        return;
      }

      // F11 to toggle fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        setIsFullScreen(prev => !prev);
        return;
      }

      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, onSave]);

  // Validate YAML content
  const validateYAML = useCallback((content: string): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Handle empty content
    if (!content.trim()) {
      return errors;
    }

    // Step 1: Parse YAML syntax
    let parsedData: unknown;
    try {
      parsedData = parseYAML(content, {
        prettyErrors: true,
        strict: false
      });
    } catch (error) {
      if (error instanceof YAMLParseError) {
        const lineMatch = error.message.match(/at line (\d+)/);
        const colMatch = error.message.match(/column (\d+)/);
        const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
        const column = colMatch ? parseInt(colMatch[1], 10) : 1;

        errors.push({
          line,
          column,
          message: error.message.replace(/at line \d+,?\s*column \d+:?\s*/g, '').trim(),
          severity: 'error',
          source: 'yaml'
        });
      } else if (error instanceof Error) {
        errors.push({
          line: 1,
          column: 1,
          message: error.message,
          severity: 'error',
          source: 'yaml'
        });
      }
      return errors;
    }

    // Step 2: Validate against JSON Schema
    if (parsedData && typeof parsedData === 'object') {
      const valid = validateSchema(parsedData);

      if (!valid && validateSchema.errors) {
        for (const error of validateSchema.errors) {
          const path = error.instancePath || error.schemaPath;
          const pathParts = path.split('/').filter(Boolean);

          // Try to find the line number for the error path
          const line = findLineForPath(content, pathParts);

          let message = error.message || 'Validation error';
          if (error.keyword === 'enum') {
            const allowedValues = (error.params as { allowedValues?: string[] }).allowedValues;
            message = `${message}: ${allowedValues?.join(', ')}`;
          } else if (error.keyword === 'additionalProperties') {
            const prop = (error.params as { additionalProperty?: string }).additionalProperty;
            message = `Unknown property: "${prop}"`;
          } else if (error.keyword === 'required') {
            const missingProp = (error.params as { missingProperty?: string }).missingProperty;
            message = `Missing required property: "${missingProp}"`;
          } else if (error.keyword === 'type') {
            const expectedType = (error.params as { type?: string }).type;
            message = `Expected type: ${expectedType}`;
          } else if (error.keyword === 'pattern') {
            message = `Value does not match required pattern`;
          } else if (error.keyword === 'minimum' || error.keyword === 'maximum') {
            const limit = (error.params as { limit?: number }).limit;
            message = `Value must be ${error.keyword === 'minimum' ? 'at least' : 'at most'} ${limit}`;
          }

          const cleanPath = pathParts.length > 0 ? pathParts.join('.') : 'root';

          errors.push({
            line,
            column: 1,
            message: `${cleanPath}: ${message}`,
            severity: error.keyword === 'required' || error.keyword === 'type' ? 'error' : 'warning',
            source: 'schema',
            path: cleanPath
          });
        }
      }
    }

    return errors;
  }, []);

  // Find line number for a given path in YAML content
  function findLineForPath(content: string, pathParts: string[]): number {
    const lines = content.split('\n');
    let currentIndent = -1;
    let pathIndex = 0;
    let lastMatchedLine = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim() || line.trim().startsWith('#')) continue;

      const indent = line.search(/\S/);
      const keyMatch = line.trim().match(/^([a-zA-Z0-9_-]+):/);

      if (keyMatch) {
        const key = keyMatch[1];

        // If we're at a lower or equal indent level, reset path tracking
        if (indent <= currentIndent && pathIndex > 0) {
          // Check if this key matches current path part
          if (key === pathParts[0]) {
            pathIndex = 1;
            currentIndent = indent;
            lastMatchedLine = i + 1;
          }
        } else if (key === pathParts[pathIndex]) {
          lastMatchedLine = i + 1;
          pathIndex++;
          currentIndent = indent;

          if (pathIndex >= pathParts.length) {
            return i + 1;
          }
        }
      }
    }

    return lastMatchedLine;
  }

  // Run validation when content changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const errors = validateYAML(value);
      setValidationErrors(errors);
      onValidationChange?.(errors);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value, validateYAML, onValidationChange]);

  // Handle editor value change
  const handleEditorChange = useCallback((newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue);
    }
  }, [onChange]);

  // Handle cursor position change
  const handleCursorChange = useCallback((line: number, column: number) => {
    setEditorState(prev => ({
      ...prev,
      cursorLine: line,
      cursorColumn: column
    }));
  }, []);

  // Handle selection change
  const handleSelectionChange = useCallback((selectedText: string) => {
    setEditorState(prev => ({
      ...prev,
      selectedText
    }));
  }, []);

  // Handle line count change
  const handleLineCountChange = useCallback((lineCount: number) => {
    setEditorState(prev => ({
      ...prev,
      lineCount
    }));
  }, []);

  // Toolbar actions
  const handleFormat = useCallback(() => {
    editorRef.current?.format();
  }, []);

  const handleCopy = useCallback(async () => {
    const content = editorState.selectedText || value;
    await navigator.clipboard.writeText(content);
  }, [editorState.selectedText, value]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([value], { type: 'application/x-yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = agentName
      ? `${agentName.toLowerCase().replace(/\s+/g, '-')}.agent.yaml`
      : 'agent.yaml';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [value, agentName]);

  const handleUpload = useCallback((content: string) => {
    onChange(content);
  }, [onChange]);

  const handleUndo = useCallback(() => {
    editorRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    editorRef.current?.redo();
  }, []);

  const handleFind = useCallback(() => {
    editorRef.current?.openSearch();
  }, []);

  const handleFoldAll = useCallback(() => {
    editorRef.current?.foldAll();
  }, []);

  const handleUnfoldAll = useCallback(() => {
    editorRef.current?.unfoldAll();
  }, []);

  const handleGoToLine = useCallback((line: number) => {
    editorRef.current?.goToLine(line);
  }, []);

  // Toggle theme
  const handleToggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // Toggle fullscreen
  const handleToggleFullScreen = useCallback(() => {
    setIsFullScreen(prev => !prev);
  }, []);

  // Toggle minimap
  const handleToggleMinimap = useCallback(() => {
    setMinimapEnabled(prev => !prev);
  }, []);

  // Handle error click in validation panel
  const handleErrorClick = useCallback((error: ValidationError) => {
    editorRef.current?.goToLine(error.line);
    editorRef.current?.focus();
  }, []);

  // Container classes for fullscreen mode
  const containerClasses = cn(
    'flex flex-col bg-white dark:bg-dark-bg-primary',
    'border border-slate-200 dark:border-dark-border-primary rounded-lg overflow-hidden',
    isFullScreen && 'fixed inset-0 z-50 rounded-none border-none',
    className
  );

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={isFullScreen ? undefined : { minHeight, maxHeight }}
    >
      {/* Toolbar */}
      {showToolbar && (
        <YAMLToolbar
          onFormat={handleFormat}
          onCopy={handleCopy}
          onDownload={handleDownload}
          onUpload={handleUpload}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onFind={handleFind}
          onFoldAll={handleFoldAll}
          onUnfoldAll={handleUnfoldAll}
          onToggleTheme={handleToggleTheme}
          onToggleFullScreen={handleToggleFullScreen}
          onToggleMinimap={handleToggleMinimap}
          onGoToLine={handleGoToLine}
          theme={theme}
          hasSelection={editorState.selectedText.length > 0}
          errorCount={validationErrors.filter(e => e.severity === 'error').length}
          warningCount={validationErrors.filter(e => e.severity === 'warning').length}
          cursorPosition={{ line: editorState.cursorLine, column: editorState.cursorColumn }}
          lineCount={editorState.lineCount}
          readOnly={readOnly}
          isFullScreen={isFullScreen}
          minimapEnabled={minimapEnabled}
          activeTab={activeTab}
          onTabChange={onTabChange}
          agentId={agentId}
        />
      )}

      {/* Editor Container */}
      <div className="flex flex-1 min-h-0">
        {/* Monaco Editor */}
        <div className={cn(
          'flex-1 min-w-0',
          showValidation && validationPanelOpen && validationErrors.length > 0
            ? 'w-3/4'
            : 'w-full'
        )}>
          <MonacoWrapper
            ref={editorRef}
            value={value}
            onChange={handleEditorChange}
            onCursorChange={handleCursorChange}
            onSelectionChange={handleSelectionChange}
            onLineCountChange={handleLineCountChange}
            validationErrors={validationErrors}
            theme={theme}
            readOnly={readOnly}
            minimapEnabled={minimapEnabled}
          />
        </div>

        {/* Validation Panel */}
        {showValidation && validationPanelOpen && validationErrors.length > 0 && (
          <div className="w-1/4 min-w-[280px] max-w-[400px] border-l border-slate-200 dark:border-dark-border-primary">
            <YAMLValidation
              errors={validationErrors}
              onErrorClick={handleErrorClick}
              onClose={() => setValidationPanelOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Collapsed Validation Toggle */}
      {showValidation && !validationPanelOpen && validationErrors.length > 0 && (
        <button
          onClick={() => setValidationPanelOpen(true)}
          className={cn(
            'absolute right-4 bottom-4 flex items-center gap-2 px-3 py-2 rounded-lg',
            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
            'border border-red-200 dark:border-red-800',
            'hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors',
            'shadow-lg'
          )}
        >
          <span className="text-sm font-medium">
            {validationErrors.length} issue{validationErrors.length > 1 ? 's' : ''}
          </span>
        </button>
      )}

      {/* Fullscreen Overlay Close Hint */}
      {isFullScreen && (
        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/50 text-white/70 text-xs">
          Press ESC or F11 to exit fullscreen
        </div>
      )}
    </div>
  );
}

export default YAMLEditor;
