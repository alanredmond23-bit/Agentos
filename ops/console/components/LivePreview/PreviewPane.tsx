/**
 * AgentOS Studio - Preview Pane Component
 * Resizable 2/3-pane layout with form, YAML, and JSON preview
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Editor from '@monaco-editor/react';
import { JSONPreview } from './JSONPreview';
import {
  type AgentFormData,
  type ValidationResult,
  type ValidationError,
} from '@/lib/studio/formYamlSync';
import {
  Code2,
  FileJson,
  GripVertical,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export interface PreviewPaneProps {
  layout: '2-pane' | '3-pane';
  formData: AgentFormData;
  yamlContent: string;
  jsonOutput: string;
  validation: ValidationResult;
  isSyncing: boolean;
  lastSource: 'form' | 'yaml' | 'none';
  activeTab: 'yaml' | 'json';
  previewTabs: Array<{ id: string; label: string; icon: React.ReactNode }>;
  readOnly?: boolean;
  onFormChange: (updates: Partial<AgentFormData>) => void;
  onYamlChange: (value: string) => void;
  onTabChange: (tab: string) => void;
}

interface ResizablePaneProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
  onResize?: (width: number) => void;
  showHandle?: boolean;
  handlePosition?: 'left' | 'right';
}

// ============================================
// Resizable Pane Component
// ============================================

function ResizablePane({
  children,
  defaultWidth = 400,
  minWidth = 200,
  maxWidth = 800,
  className,
  onResize,
  showHandle = true,
  handlePosition = 'right',
}: ResizablePaneProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const paneRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = handlePosition === 'right'
        ? e.clientX - startXRef.current
        : startXRef.current - e.clientX;

      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + deltaX));
      setWidth(newWidth);
      onResize?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, minWidth, maxWidth, handlePosition, onResize]);

  return (
    <div
      ref={paneRef}
      className={cn('relative flex-shrink-0', className)}
      style={{ width }}
    >
      {children}
      {showHandle && (
        <div
          className={cn(
            'absolute top-0 bottom-0 w-1 cursor-col-resize z-10 group',
            'hover:bg-brand-500/50 transition-colors',
            isResizing && 'bg-brand-500',
            handlePosition === 'right' ? 'right-0' : 'left-0'
          )}
          onMouseDown={handleMouseDown}
        >
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 flex items-center justify-center',
              'w-4 h-8 rounded bg-slate-200 dark:bg-dark-bg-tertiary',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              handlePosition === 'right' ? '-right-1.5' : '-left-1.5'
            )}
          >
            <GripVertical className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Preview Pane Component
// ============================================

export function PreviewPane({
  layout,
  formData,
  yamlContent,
  jsonOutput,
  validation,
  isSyncing,
  lastSource,
  activeTab,
  previewTabs,
  readOnly = false,
  onFormChange,
  onYamlChange,
  onTabChange,
}: PreviewPaneProps) {
  const [formPaneWidth, setFormPaneWidth] = useState(400);
  const [yamlPaneWidth, setYamlPaneWidth] = useState(layout === '3-pane' ? 400 : 500);

  // Get error decorations for Monaco editor
  const getEditorDecorations = useCallback(() => {
    return validation.errors
      .filter(err => err.line !== undefined)
      .map(err => ({
        range: {
          startLineNumber: err.line!,
          startColumn: err.column || 1,
          endLineNumber: err.line!,
          endColumn: 1000,
        },
        options: {
          isWholeLine: true,
          className: 'bg-red-500/10',
          glyphMarginClassName: 'bg-red-500',
          hoverMessage: { value: err.message },
        },
      }));
  }, [validation.errors]);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Form Pane */}
      <ResizablePane
        defaultWidth={formPaneWidth}
        minWidth={280}
        maxWidth={600}
        onResize={setFormPaneWidth}
        className="border-r border-slate-200 dark:border-dark-border-primary"
      >
        <FormPane
          formData={formData}
          validation={validation}
          readOnly={readOnly}
          onChange={onFormChange}
          isActive={lastSource === 'form'}
        />
      </ResizablePane>

      {/* YAML/JSON Pane */}
      {layout === '3-pane' ? (
        <>
          {/* YAML Editor Pane */}
          <ResizablePane
            defaultWidth={yamlPaneWidth}
            minWidth={300}
            maxWidth={700}
            onResize={setYamlPaneWidth}
            className="border-r border-slate-200 dark:border-dark-border-primary"
          >
            <YamlEditorPane
              yamlContent={yamlContent}
              validation={validation}
              isSyncing={isSyncing}
              readOnly={readOnly}
              onChange={onYamlChange}
              isActive={lastSource === 'yaml'}
            />
          </ResizablePane>

          {/* JSON Preview Pane */}
          <div className="flex-1 min-w-0">
            <JSONPreview
              jsonContent={jsonOutput}
              validation={validation}
            />
          </div>
        </>
      ) : (
        /* 2-pane layout with tabs */
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab header */}
          <div className="flex items-center border-b border-slate-200 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-secondary">
            {previewTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                  'border-b-2 -mb-px',
                  activeTab === tab.id
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}

            {/* Sync indicator */}
            {isSyncing && (
              <div className="ml-auto mr-4 flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Syncing...
              </div>
            )}
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0">
            {activeTab === 'yaml' ? (
              <YamlEditorPane
                yamlContent={yamlContent}
                validation={validation}
                isSyncing={isSyncing}
                readOnly={readOnly}
                onChange={onYamlChange}
                isActive={lastSource === 'yaml'}
              />
            ) : (
              <JSONPreview
                jsonContent={jsonOutput}
                validation={validation}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Form Pane Component
// ============================================

interface FormPaneProps {
  formData: AgentFormData;
  validation: ValidationResult;
  readOnly: boolean;
  onChange: (updates: Partial<AgentFormData>) => void;
  isActive: boolean;
}

function FormPane({ formData, validation, readOnly, onChange, isActive }: FormPaneProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'model', 'rateLimit'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const getFieldError = (path: string): ValidationError | undefined => {
    return validation.errors.find(e => e.path === path);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-bg-primary">
      {/* Pane header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-2 border-b',
        'border-slate-200 dark:border-dark-border-primary',
        isActive && 'bg-brand-50 dark:bg-brand-500/10'
      )}>
        <span className="text-sm font-medium text-slate-700 dark:text-dark-text-primary">
          Configuration Form
        </span>
        {isActive && (
          <span className="text-xs text-brand-600 dark:text-brand-400">Active</span>
        )}
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Basic Information Section */}
        <FormSection
          title="Basic Information"
          sectionKey="basic"
          isExpanded={expandedSections.has('basic')}
          onToggle={() => toggleSection('basic')}
        >
          <FormField
            label="Name"
            value={formData.name}
            error={getFieldError('name')}
            readOnly={readOnly}
            onChange={(value) => onChange({ name: value })}
            placeholder="Enter agent name"
          />
          <FormField
            label="Slug"
            value={formData.slug}
            error={getFieldError('slug')}
            readOnly={readOnly}
            onChange={(value) => onChange({ slug: value })}
            placeholder="agent-slug"
          />
          <FormField
            label="Description"
            value={formData.description}
            error={getFieldError('description')}
            readOnly={readOnly}
            onChange={(value) => onChange({ description: value })}
            multiline
            placeholder="Describe what this agent does"
          />
          <FormField
            label="Pack"
            value={formData.pack}
            error={getFieldError('pack')}
            readOnly={readOnly}
            onChange={(value) => onChange({ pack: value })}
            type="select"
            options={[
              'engineering', 'devops', 'qa', 'legal', 'mobile',
              'research', 'planning', 'analytics', 'orchestration',
              'error_predictor', 'product', 'marketing', 'supabase', 'design'
            ]}
          />
          <FormField
            label="Version"
            value={formData.version}
            error={getFieldError('version')}
            readOnly={readOnly}
            onChange={(value) => onChange({ version: value })}
            placeholder="1.0.0"
          />
        </FormSection>

        {/* Model Configuration Section */}
        <FormSection
          title="Model Configuration"
          sectionKey="model"
          isExpanded={expandedSections.has('model')}
          onToggle={() => toggleSection('model')}
        >
          <FormField
            label="Model"
            value={formData.model}
            error={getFieldError('model')}
            readOnly={readOnly}
            onChange={(value) => onChange({ model: value })}
            type="select"
            options={[
              'claude-3-opus-20240229',
              'claude-3-sonnet-20240229',
              'claude-3-haiku-20240307',
              'claude-3-5-sonnet-20241022',
              'gpt-4-turbo',
              'gpt-4o',
            ]}
          />
          <FormField
            label="Temperature"
            value={formData.temperature.toString()}
            error={getFieldError('temperature')}
            readOnly={readOnly}
            onChange={(value) => onChange({ temperature: parseFloat(value) || 0 })}
            type="number"
            min={0}
            max={2}
            step={0.1}
          />
          <FormField
            label="Max Tokens"
            value={formData.maxTokens.toString()}
            error={getFieldError('maxTokens')}
            readOnly={readOnly}
            onChange={(value) => onChange({ maxTokens: parseInt(value) || 4096 })}
            type="number"
            min={1}
            max={200000}
          />
          <FormField
            label="Auto-Approve Threshold"
            value={formData.autoApproveThreshold.toString()}
            error={getFieldError('autoApproveThreshold')}
            readOnly={readOnly}
            onChange={(value) => onChange({ autoApproveThreshold: parseFloat(value) || 0 })}
            type="number"
            min={0}
            max={1}
            step={0.05}
          />
        </FormSection>

        {/* Rate Limit Section */}
        <FormSection
          title="Rate Limiting"
          sectionKey="rateLimit"
          isExpanded={expandedSections.has('rateLimit')}
          onToggle={() => toggleSection('rateLimit')}
        >
          <FormField
            label="Requests/Minute"
            value={formData.rateLimit.requestsPerMinute.toString()}
            error={getFieldError('rateLimit.requestsPerMinute')}
            readOnly={readOnly}
            onChange={(value) => onChange({
              rateLimit: { ...formData.rateLimit, requestsPerMinute: parseInt(value) || 60 }
            })}
            type="number"
            min={1}
          />
          <FormField
            label="Requests/Hour"
            value={formData.rateLimit.requestsPerHour.toString()}
            error={getFieldError('rateLimit.requestsPerHour')}
            readOnly={readOnly}
            onChange={(value) => onChange({
              rateLimit: { ...formData.rateLimit, requestsPerHour: parseInt(value) || 1000 }
            })}
            type="number"
            min={1}
          />
          <FormField
            label="Requests/Day"
            value={formData.rateLimit.requestsPerDay.toString()}
            error={getFieldError('rateLimit.requestsPerDay')}
            readOnly={readOnly}
            onChange={(value) => onChange({
              rateLimit: { ...formData.rateLimit, requestsPerDay: parseInt(value) || 10000 }
            })}
            type="number"
            min={1}
          />
        </FormSection>

        {/* Retry Policy Section */}
        <FormSection
          title="Retry Policy"
          sectionKey="retry"
          isExpanded={expandedSections.has('retry')}
          onToggle={() => toggleSection('retry')}
        >
          <FormField
            label="Max Retries"
            value={formData.retryPolicy.maxRetries.toString()}
            error={getFieldError('retryPolicy.maxRetries')}
            readOnly={readOnly}
            onChange={(value) => onChange({
              retryPolicy: { ...formData.retryPolicy, maxRetries: parseInt(value) || 3 }
            })}
            type="number"
            min={0}
            max={10}
          />
          <FormField
            label="Initial Delay (ms)"
            value={formData.retryPolicy.initialDelayMs.toString()}
            error={getFieldError('retryPolicy.initialDelayMs')}
            readOnly={readOnly}
            onChange={(value) => onChange({
              retryPolicy: { ...formData.retryPolicy, initialDelayMs: parseInt(value) || 1000 }
            })}
            type="number"
            min={100}
          />
          <FormField
            label="Max Delay (ms)"
            value={formData.retryPolicy.maxDelayMs.toString()}
            error={getFieldError('retryPolicy.maxDelayMs')}
            readOnly={readOnly}
            onChange={(value) => onChange({
              retryPolicy: { ...formData.retryPolicy, maxDelayMs: parseInt(value) || 30000 }
            })}
            type="number"
            min={1000}
          />
          <FormField
            label="Backoff Multiplier"
            value={formData.retryPolicy.backoffMultiplier.toString()}
            error={getFieldError('retryPolicy.backoffMultiplier')}
            readOnly={readOnly}
            onChange={(value) => onChange({
              retryPolicy: { ...formData.retryPolicy, backoffMultiplier: parseFloat(value) || 2 }
            })}
            type="number"
            min={1}
            max={5}
            step={0.5}
          />
        </FormSection>

        {/* System Prompt Section */}
        <FormSection
          title="System Prompt"
          sectionKey="systemPrompt"
          isExpanded={expandedSections.has('systemPrompt')}
          onToggle={() => toggleSection('systemPrompt')}
        >
          <FormField
            label=""
            value={formData.systemPrompt}
            error={getFieldError('systemPrompt')}
            readOnly={readOnly}
            onChange={(value) => onChange({ systemPrompt: value })}
            multiline
            rows={8}
            placeholder="Enter the system prompt for this agent..."
          />
        </FormSection>
      </div>
    </div>
  );
}

// ============================================
// Form Section Component
// ============================================

interface FormSectionProps {
  title: string;
  sectionKey: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function FormSection({ title, isExpanded, onToggle, children }: FormSectionProps) {
  return (
    <div className="border border-slate-200 dark:border-dark-border-primary rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3',
          'bg-slate-50 dark:bg-dark-bg-secondary',
          'hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary',
          'transition-colors'
        )}
      >
        <span className="text-sm font-medium text-slate-700 dark:text-dark-text-primary">
          {title}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white dark:bg-dark-bg-primary">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================
// Form Field Component
// ============================================

interface FormFieldProps {
  label: string;
  value: string;
  error?: ValidationError;
  readOnly: boolean;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'select';
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

function FormField({
  label,
  value,
  error,
  readOnly,
  onChange,
  type = 'text',
  multiline = false,
  rows = 3,
  placeholder,
  options,
  min,
  max,
  step,
}: FormFieldProps) {
  const inputClasses = cn(
    'w-full px-3 py-2 rounded-lg text-sm',
    'border transition-colors',
    'bg-white dark:bg-dark-bg-secondary',
    'text-slate-900 dark:text-dark-text-primary',
    'placeholder:text-slate-400 dark:placeholder:text-dark-text-muted',
    error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-slate-200 dark:border-dark-border-primary focus:border-brand-500 focus:ring-brand-500',
    'focus:outline-none focus:ring-1',
    readOnly && 'bg-slate-50 dark:bg-dark-bg-tertiary cursor-not-allowed'
  );

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-medium text-slate-600 dark:text-dark-text-secondary">
          {label}
        </label>
      )}

      {type === 'select' && options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className={inputClasses}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          rows={rows}
          placeholder={placeholder}
          className={cn(inputClasses, 'resize-y')}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          className={inputClasses}
        />
      )}

      {error && (
        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-3 h-3" />
          {error.message}
        </div>
      )}
    </div>
  );
}

// ============================================
// YAML Editor Pane Component
// ============================================

interface YamlEditorPaneProps {
  yamlContent: string;
  validation: ValidationResult;
  isSyncing: boolean;
  readOnly: boolean;
  onChange: (value: string) => void;
  isActive: boolean;
}

function YamlEditorPane({
  yamlContent,
  validation,
  isSyncing,
  readOnly,
  onChange,
  isActive,
}: YamlEditorPaneProps) {
  const editorRef = useRef<any>(null);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Pane header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-2 border-b',
        'border-slate-700',
        isActive && 'bg-brand-900/50'
      )}>
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">
            YAML Editor
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isSyncing && (
            <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
          )}
          {isActive && (
            <span className="text-xs text-brand-400">Active</span>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="yaml"
          value={yamlContent}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'JetBrains Mono, monospace',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            theme: 'vs-dark',
            folding: true,
            glyphMargin: true,
            renderLineHighlight: 'line',
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
          }}
        />
      </div>

      {/* Error summary */}
      {validation.errors.length > 0 && (
        <div className="px-4 py-2 bg-red-900/50 border-t border-red-800">
          <div className="flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-3 h-3" />
            <span>
              {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''} found
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Exports
// ============================================

export default PreviewPane;
