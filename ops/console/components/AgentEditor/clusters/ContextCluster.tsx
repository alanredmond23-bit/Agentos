/**
 * AgentOS Ops Console - Context Cluster
 * Configuration for system prompt, few-shot examples, and context injection
 */

'use client';

import React, { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RichTextField } from '../fields/RichTextField';
import { KeyValueEditor, KeyValuePair } from '../fields/KeyValueEditor';
import { ArrayField, ArrayItem } from '../fields/ArrayField';
import { SliderField } from '../fields/SliderField';
import {
  MessageSquare,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  User,
  Bot,
  Copy,
  RotateCcw,
  AlertCircle,
  Info,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export interface FewShotExample {
  id: string;
  name: string;
  userMessage: string;
  assistantResponse: string;
  enabled: boolean;
}

export interface ContextVariable {
  id: string;
  name: string;
  value: string;
  description: string;
  sensitive: boolean;
}

export interface ContextClusterValue {
  systemPrompt: {
    content: string;
    maxTokens: number;
    includeDateTime: boolean;
    includeUserInfo: boolean;
    includeSessionHistory: boolean;
    template: string;
  };
  fewShotExamples: FewShotExample[];
  contextVariables: ContextVariable[];
  contextWindow: {
    maxTokens: number;
    reserveForOutput: number;
    summarizeHistory: boolean;
    summarizeThreshold: number;
  };
  personalization: {
    enabled: boolean;
    learnFromInteractions: boolean;
    preferenceKeys: ArrayItem[];
  };
}

interface ContextClusterProps {
  value: ContextClusterValue;
  onChange: (value: ContextClusterValue) => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const SYSTEM_PROMPT_TEMPLATES = [
  {
    name: 'Helpful Assistant',
    content: `You are a helpful, harmless, and honest AI assistant. You aim to provide accurate, thoughtful, and helpful responses while being transparent about your limitations.

Key behaviors:
- Be direct and concise in your responses
- Acknowledge uncertainty when appropriate
- Refuse harmful or unethical requests politely
- Prioritize user safety and well-being`,
  },
  {
    name: 'Technical Expert',
    content: `You are an expert software engineer and technical consultant. You provide detailed, accurate technical guidance while considering best practices, security, and maintainability.

Key behaviors:
- Provide code examples when helpful
- Explain trade-offs between approaches
- Consider security implications
- Follow industry best practices`,
  },
  {
    name: 'Creative Writer',
    content: `You are a creative writing assistant with expertise in storytelling, content creation, and editing. You help users craft compelling narratives while maintaining their unique voice.

Key behaviors:
- Encourage creativity and exploration
- Provide constructive feedback
- Adapt to different writing styles
- Suggest improvements without overriding user intent`,
  },
];

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function countTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// ============================================
// Few Shot Example Component
// ============================================

interface FewShotExampleItemProps {
  example: FewShotExample;
  onUpdate: (updates: Partial<FewShotExample>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  disabled?: boolean;
}

function FewShotExampleItem({ example, onUpdate, onRemove, onDuplicate, disabled }: FewShotExampleItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden',
        'border-slate-200 dark:border-dark-border-primary',
        'bg-white dark:bg-dark-bg-secondary',
        !example.enabled && 'opacity-60',
        disabled && 'opacity-50'
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ enabled: !example.enabled });
          }}
          disabled={disabled}
          className={cn(
            'w-10 h-6 rounded-full transition-colors relative',
            example.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
          )}
        >
          <span
            className={cn(
              'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
              example.enabled ? 'left-5' : 'left-1'
            )}
          />
        </button>

        <Sparkles className="w-5 h-5 text-purple-500" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 dark:text-dark-text-primary">
              {example.name || 'Unnamed Example'}
            </span>
            <Badge size="sm" className="bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400">
              {countTokens(example.userMessage + example.assistantResponse)} tokens
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-dark-text-tertiary truncate">
            {example.userMessage.slice(0, 60)}...
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            disabled={disabled}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary text-slate-400 hover:text-slate-600"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            disabled={disabled}
            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-dark-border-primary p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
              Example Name
            </label>
            <input
              type="text"
              value={example.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Descriptive name for this example"
              disabled={disabled}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
              <User className="w-4 h-4 text-blue-500" />
              User Message
            </div>
            <textarea
              value={example.userMessage}
              onChange={(e) => onUpdate({ userMessage: e.target.value })}
              placeholder="What the user would say..."
              disabled={disabled}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary resize-none"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
              <Bot className="w-4 h-4 text-emerald-500" />
              Assistant Response
            </div>
            <textarea
              value={example.assistantResponse}
              onChange={(e) => onUpdate({ assistantResponse: e.target.value })}
              placeholder="How the assistant should respond..."
              disabled={disabled}
              rows={5}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Context Cluster Component
// ============================================

export function ContextCluster({
  value,
  onChange,
  disabled = false,
  className,
}: ContextClusterProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  const updateSystemPrompt = (updates: Partial<typeof value.systemPrompt>) => {
    onChange({ ...value, systemPrompt: { ...value.systemPrompt, ...updates } });
  };

  const updateContextWindow = (updates: Partial<typeof value.contextWindow>) => {
    onChange({ ...value, contextWindow: { ...value.contextWindow, ...updates } });
  };

  const updatePersonalization = (updates: Partial<typeof value.personalization>) => {
    onChange({ ...value, personalization: { ...value.personalization, ...updates } });
  };

  const addFewShotExample = useCallback(() => {
    const newExample: FewShotExample = {
      id: generateId(),
      name: '',
      userMessage: '',
      assistantResponse: '',
      enabled: true,
    };
    onChange({ ...value, fewShotExamples: [...value.fewShotExamples, newExample] });
  }, [value, onChange]);

  const updateFewShotExample = useCallback(
    (id: string, updates: Partial<FewShotExample>) => {
      onChange({
        ...value,
        fewShotExamples: value.fewShotExamples.map((ex) =>
          ex.id === id ? { ...ex, ...updates } : ex
        ),
      });
    },
    [value, onChange]
  );

  const removeFewShotExample = useCallback(
    (id: string) => {
      onChange({
        ...value,
        fewShotExamples: value.fewShotExamples.filter((ex) => ex.id !== id),
      });
    },
    [value, onChange]
  );

  const duplicateFewShotExample = useCallback(
    (id: string) => {
      const example = value.fewShotExamples.find((ex) => ex.id === id);
      if (example) {
        const duplicate: FewShotExample = {
          ...example,
          id: generateId(),
          name: `${example.name} (Copy)`,
        };
        onChange({ ...value, fewShotExamples: [...value.fewShotExamples, duplicate] });
      }
    },
    [value, onChange]
  );

  const addContextVariable = useCallback(() => {
    const newVar: ContextVariable = {
      id: generateId(),
      name: '',
      value: '',
      description: '',
      sensitive: false,
    };
    onChange({ ...value, contextVariables: [...value.contextVariables, newVar] });
  }, [value, onChange]);

  const updateContextVariable = useCallback(
    (id: string, updates: Partial<ContextVariable>) => {
      onChange({
        ...value,
        contextVariables: value.contextVariables.map((v) =>
          v.id === id ? { ...v, ...updates } : v
        ),
      });
    },
    [value, onChange]
  );

  const removeContextVariable = useCallback(
    (id: string) => {
      onChange({
        ...value,
        contextVariables: value.contextVariables.filter((v) => v.id !== id),
      });
    },
    [value, onChange]
  );

  const applyTemplate = (template: typeof SYSTEM_PROMPT_TEMPLATES[0]) => {
    updateSystemPrompt({ content: template.content, template: template.name });
    setShowTemplates(false);
  };

  const systemPromptTokens = countTokens(value.systemPrompt.content);
  const fewShotTokens = value.fewShotExamples
    .filter((ex) => ex.enabled)
    .reduce((sum, ex) => sum + countTokens(ex.userMessage + ex.assistantResponse), 0);
  const totalContextTokens = systemPromptTokens + fewShotTokens;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-500/20">
            <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <CardTitle>Context Configuration</CardTitle>
            <CardDescription>
              Configure system prompt, few-shot examples, and context management
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Token Usage Summary */}
        <div className="flex items-center gap-6 p-3 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="text-sm">
              System: {systemPromptTokens.toLocaleString()} tokens
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm">
              Examples: {fewShotTokens.toLocaleString()} tokens
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className={cn(
              'text-sm font-medium',
              totalContextTokens > value.contextWindow.maxTokens * 0.5
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-600 dark:text-dark-text-secondary'
            )}>
              Total: {totalContextTokens.toLocaleString()} / {value.contextWindow.maxTokens.toLocaleString()}
            </span>
          </div>
        </div>

        {/* System Prompt */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
                System Prompt
              </h4>
              {value.systemPrompt.template && (
                <Badge size="sm" className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                  {value.systemPrompt.template}
                </Badge>
              )}
            </div>
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
                disabled={disabled}
              >
                Templates
                <ChevronDown className={cn('w-4 h-4 ml-1 transition-transform', showTemplates && 'rotate-180')} />
              </Button>

              {showTemplates && (
                <div className="absolute right-0 z-10 mt-2 w-64 rounded-lg border border-slate-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary shadow-lg">
                  {SYSTEM_PROMPT_TEMPLATES.map((template) => (
                    <button
                      key={template.name}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary"
                    >
                      <div className="font-medium text-slate-900 dark:text-dark-text-primary">
                        {template.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-1">
                        {template.content.slice(0, 80)}...
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <RichTextField
            value={value.systemPrompt.content}
            onChange={(content) => updateSystemPrompt({ content })}
            placeholder="You are a helpful AI assistant..."
            disabled={disabled}
            minHeight={200}
            maxHeight={400}
            showCharacterCount
            maxCharacters={value.systemPrompt.maxTokens * 4}
          />

          <div className="grid grid-cols-3 gap-4 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value.systemPrompt.includeDateTime}
                onChange={(e) => updateSystemPrompt({ includeDateTime: e.target.checked })}
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                Include date/time
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value.systemPrompt.includeUserInfo}
                onChange={(e) => updateSystemPrompt({ includeUserInfo: e.target.checked })}
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                Include user info
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value.systemPrompt.includeSessionHistory}
                onChange={(e) => updateSystemPrompt({ includeSessionHistory: e.target.checked })}
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                Include session history
              </span>
            </label>
          </div>
        </div>

        {/* Few-Shot Examples */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-slate-500" />
              <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
                Few-Shot Examples ({value.fewShotExamples.length})
              </h4>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addFewShotExample}
              disabled={disabled}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Example
            </Button>
          </div>

          <div className="space-y-3">
            {value.fewShotExamples.map((example) => (
              <FewShotExampleItem
                key={example.id}
                example={example}
                onUpdate={(updates) => updateFewShotExample(example.id, updates)}
                onRemove={() => removeFewShotExample(example.id)}
                onDuplicate={() => duplicateFewShotExample(example.id)}
                disabled={disabled}
              />
            ))}
          </div>

          {value.fewShotExamples.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-dark-border-primary rounded-lg">
              <Sparkles className="w-8 h-8 text-slate-300 dark:text-dark-text-muted mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                No few-shot examples. Add examples to guide agent behavior.
              </p>
            </div>
          )}
        </div>

        {/* Context Variables */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-slate-500" />
              <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
                Context Variables ({value.contextVariables.length})
              </h4>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addContextVariable}
              disabled={disabled}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Variable
            </Button>
          </div>

          <div className="space-y-3">
            {value.contextVariables.map((variable) => (
              <div
                key={variable.id}
                className="grid grid-cols-12 gap-2 p-3 rounded-lg bg-white dark:bg-dark-bg-secondary border border-slate-200 dark:border-dark-border-secondary"
              >
                <div className="col-span-3">
                  <input
                    type="text"
                    value={variable.name}
                    onChange={(e) => updateContextVariable(variable.id, { name: e.target.value })}
                    placeholder="Variable name"
                    disabled={disabled}
                    className="w-full px-2 py-1.5 text-sm font-mono rounded border border-slate-200 dark:border-dark-border-secondary"
                  />
                </div>
                <div className="col-span-5">
                  <input
                    type={variable.sensitive ? 'password' : 'text'}
                    value={variable.value}
                    onChange={(e) => updateContextVariable(variable.id, { value: e.target.value })}
                    placeholder="Value"
                    disabled={disabled}
                    className="w-full px-2 py-1.5 text-sm rounded border border-slate-200 dark:border-dark-border-secondary"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    value={variable.description}
                    onChange={(e) => updateContextVariable(variable.id, { description: e.target.value })}
                    placeholder="Description"
                    disabled={disabled}
                    className="w-full px-2 py-1.5 text-sm rounded border border-slate-200 dark:border-dark-border-secondary"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateContextVariable(variable.id, { sensitive: !variable.sensitive })}
                    disabled={disabled}
                    className={cn(
                      'p-1 rounded',
                      variable.sensitive ? 'text-amber-500' : 'text-slate-400'
                    )}
                    title={variable.sensitive ? 'Sensitive (hidden)' : 'Not sensitive'}
                  >
                    <AlertCircle className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeContextVariable(variable.id)}
                    disabled={disabled}
                    className="p-1 rounded text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {value.contextVariables.length === 0 && (
            <p className="text-center text-sm text-slate-500 dark:text-dark-text-tertiary py-4">
              No context variables defined
            </p>
          )}
        </div>

        {/* Context Window Settings */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <h4 className="font-medium text-slate-900 dark:text-dark-text-primary mb-4">
            Context Window Settings
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <SliderField
              label="Max Context Tokens"
              value={value.contextWindow.maxTokens}
              onChange={(maxTokens) => updateContextWindow({ maxTokens })}
              min={4000}
              max={200000}
              step={1000}
              valueFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              marks={[
                { value: 8000, label: '8K' },
                { value: 32000, label: '32K' },
                { value: 128000, label: '128K' },
              ]}
              disabled={disabled}
            />

            <SliderField
              label="Reserve for Output"
              value={value.contextWindow.reserveForOutput}
              onChange={(reserveForOutput) => updateContextWindow({ reserveForOutput })}
              min={1000}
              max={32000}
              step={500}
              valueFormatter={(v) => `${(v / 1000).toFixed(1)}K`}
              disabled={disabled}
            />
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value.contextWindow.summarizeHistory}
                onChange={(e) => updateContextWindow({ summarizeHistory: e.target.checked })}
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                Summarize history when context is full
              </span>
            </label>

            {value.contextWindow.summarizeHistory && (
              <SliderField
                label="Summarization Threshold"
                value={value.contextWindow.summarizeThreshold}
                onChange={(summarizeThreshold) => updateContextWindow({ summarizeThreshold })}
                min={50}
                max={90}
                step={5}
                valueFormatter={(v) => `${v}%`}
                hint="Summarize when context reaches this percentage of max"
                disabled={disabled}
              />
            )}
          </div>
        </div>

        {/* Personalization */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-slate-500" />
              <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
                Personalization
              </h4>
            </div>
            <button
              type="button"
              onClick={() => updatePersonalization({ enabled: !value.personalization.enabled })}
              disabled={disabled}
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                value.personalization.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  value.personalization.enabled ? 'left-6' : 'left-1'
                )}
              />
            </button>
          </div>

          {value.personalization.enabled && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.personalization.learnFromInteractions}
                  onChange={(e) => updatePersonalization({ learnFromInteractions: e.target.checked })}
                  disabled={disabled}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                  Learn from user interactions
                </span>
              </label>

              <ArrayField
                label="Preference Keys"
                value={value.personalization.preferenceKeys}
                onChange={(preferenceKeys) => updatePersonalization({ preferenceKeys })}
                placeholder="e.g., preferred_language"
                disabled={disabled}
                hint="User preferences to track and apply"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ContextCluster;
