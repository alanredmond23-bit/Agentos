/**
 * AgentOS Ops Console - TechnicalCluster Component
 * Cluster for technical settings: model, endpoint, temperature, tokens
 */

import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { ChevronDown, Cpu, Zap, Gauge, Server } from 'lucide-react';
import { TextField } from '../fields/TextField';
import { SelectField, SelectOption } from '../fields/SelectField';
import { NumberField } from '../fields/NumberField';
import { ToggleField } from '../fields/ToggleField';
import { TagInput } from '../fields/TagInput';

// ============================================
// TechnicalCluster Types
// ============================================

export interface TechnicalClusterProps {
  isExpanded?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const MODEL_OPTIONS: SelectOption[] = [
  {
    value: 'claude-opus-4-5-20251101',
    label: 'Claude Opus 4.5',
    description: 'Most capable, best for complex reasoning',
    icon: <Cpu className="w-4 h-4 text-purple-500" />
  },
  {
    value: 'claude-sonnet-4-20250514',
    label: 'Claude Sonnet 4',
    description: 'Balanced performance and cost',
    icon: <Cpu className="w-4 h-4 text-blue-500" />
  },
  {
    value: 'claude-3-5-sonnet-20241022',
    label: 'Claude 3.5 Sonnet',
    description: 'Previous generation, cost-effective',
    icon: <Cpu className="w-4 h-4 text-cyan-500" />
  },
  {
    value: 'claude-3-5-haiku-20241022',
    label: 'Claude 3.5 Haiku',
    description: 'Fast and efficient for simple tasks',
    icon: <Cpu className="w-4 h-4 text-green-500" />
  },
  {
    value: 'gpt-4-turbo',
    label: 'GPT-4 Turbo',
    description: 'OpenAI flagship model',
    icon: <Cpu className="w-4 h-4 text-emerald-500" />
  },
  {
    value: 'gpt-4o',
    label: 'GPT-4o',
    description: 'OpenAI multimodal model',
    icon: <Cpu className="w-4 h-4 text-teal-500" />
  },
  {
    value: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    description: 'OpenAI cost-effective option',
    icon: <Cpu className="w-4 h-4 text-lime-500" />
  },
];

const ENDPOINT_OPTIONS: SelectOption[] = [
  { value: 'anthropic', label: 'Anthropic API', description: 'Direct Anthropic API' },
  { value: 'openai', label: 'OpenAI API', description: 'Direct OpenAI API' },
  { value: 'azure-openai', label: 'Azure OpenAI', description: 'Azure-hosted OpenAI' },
  { value: 'bedrock', label: 'AWS Bedrock', description: 'AWS Bedrock service' },
  { value: 'vertex', label: 'Google Vertex AI', description: 'Google Cloud Vertex' },
  { value: 'custom', label: 'Custom Endpoint', description: 'Self-hosted or proxy' },
];

const TOOL_SUGGESTIONS = [
  'web-search',
  'code-execution',
  'file-operations',
  'database-query',
  'api-calls',
  'image-analysis',
  'document-parsing',
  'email-send',
  'slack-integration',
  'github-operations',
];

// ============================================
// TechnicalCluster Component
// ============================================

export function TechnicalCluster({
  isExpanded = true,
  onToggle,
  disabled = false,
  className,
}: TechnicalClusterProps) {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  const expanded = onToggle ? isExpanded : localExpanded;
  const handleToggle = onToggle || (() => setLocalExpanded(!localExpanded));

  const { watch } = useFormContext();
  const endpoint = watch('technical.endpoint');
  const temperature = watch('technical.temperature') || 0.7;
  const model = watch('technical.model');

  const getModelCostIndicator = (modelId: string) => {
    if (modelId?.includes('opus')) return { level: 'high', label: '$$$' };
    if (modelId?.includes('sonnet') || modelId?.includes('gpt-4-turbo') || modelId?.includes('gpt-4o') && !modelId?.includes('mini')) return { level: 'medium', label: '$$' };
    return { level: 'low', label: '$' };
  };

  const costIndicator = model ? getModelCostIndicator(model) : null;

  return (
    <div className={cn('border border-slate-200 dark:border-dark-border-primary rounded-lg overflow-hidden', className)}>
      {/* Cluster Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-dark-bg-tertiary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20">
            <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
              Technical Configuration
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
              Model, endpoint, and inference settings
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-slate-400 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* Cluster Content */}
      {expanded && (
        <div className="px-4 py-4 space-y-4 bg-white dark:bg-dark-bg-secondary">
          {/* Model Selection */}
          <div className="space-y-2">
            <SelectField
              name="technical.model"
              label="Model"
              options={MODEL_OPTIONS}
              placeholder="Select AI model"
              helpText="The language model powering this agent"
              required
              searchable
              disabled={disabled}
            />
            {costIndicator && (
              <div className="flex items-center gap-2">
                <span className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded',
                  costIndicator.level === 'high' && 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
                  costIndicator.level === 'medium' && 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
                  costIndicator.level === 'low' && 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                )}>
                  {costIndicator.label} Cost
                </span>
              </div>
            )}
          </div>

          {/* Endpoint */}
          <SelectField
            name="technical.endpoint"
            label="Endpoint"
            options={ENDPOINT_OPTIONS}
            placeholder="Select API endpoint"
            helpText="The API provider or hosting service"
            required
            disabled={disabled}
          />

          {/* Custom Endpoint URL */}
          {endpoint === 'custom' && (
            <TextField
              name="technical.custom_endpoint_url"
              label="Custom Endpoint URL"
              placeholder="https://api.example.com/v1"
              helpText="The full URL of your custom API endpoint"
              required
              disabled={disabled}
              pattern={/^https?:\/\/.+/}
              patternMessage="Must be a valid URL starting with http:// or https://"
            />
          )}

          {/* Temperature */}
          <div className="space-y-2">
            <NumberField
              name="technical.temperature"
              label="Temperature"
              placeholder="0.7"
              helpText="Controls randomness: 0 = deterministic, 1 = creative"
              min={0}
              max={2}
              step={0.1}
              disabled={disabled}
            />
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-slate-400" />
              <div className="flex-1 h-2 bg-slate-100 dark:bg-dark-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all"
                  style={{ width: `${(temperature / 2) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 dark:text-dark-text-tertiary w-16 text-right">
                {temperature <= 0.3 ? 'Precise' : temperature <= 0.7 ? 'Balanced' : 'Creative'}
              </span>
            </div>
          </div>

          {/* Token Limits */}
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              name="technical.max_tokens"
              label="Max Output Tokens"
              placeholder="4096"
              helpText="Maximum tokens in response"
              min={1}
              max={128000}
              step={256}
              disabled={disabled}
            />

            <NumberField
              name="technical.context_window"
              label="Context Window"
              placeholder="200000"
              helpText="Max tokens for context"
              min={1024}
              max={200000}
              step={1024}
              disabled={disabled}
            />
          </div>

          {/* Tools */}
          <TagInput
            name="technical.tools"
            label="Available Tools"
            placeholder="Add tools this agent can use..."
            helpText="External tools and integrations available to this agent"
            disabled={disabled}
            suggestions={TOOL_SUGGESTIONS}
            maxTags={20}
          />

          {/* System Prompt */}
          <TextField
            name="technical.system_prompt"
            label="System Prompt"
            placeholder="You are a helpful assistant..."
            helpText="Initial instructions that define the agent's base behavior"
            disabled={disabled}
            multiline
            rows={4}
            maxLength={10000}
          />

          {/* Technical Options */}
          <div className="pt-4 border-t border-slate-100 dark:border-dark-border-secondary space-y-3">
            <ToggleField
              name="technical.streaming"
              label="Enable Streaming"
              description="Stream responses token by token"
              disabled={disabled}
            />

            <ToggleField
              name="technical.cache_responses"
              label="Cache Responses"
              description="Cache identical prompts to reduce costs"
              disabled={disabled}
            />

            <ToggleField
              name="technical.retry_on_failure"
              label="Retry on Failure"
              description="Automatically retry failed requests"
              disabled={disabled}
            />

            <ToggleField
              name="technical.log_prompts"
              label="Log Prompts"
              description="Store all prompts and responses for debugging"
              disabled={disabled}
            />
          </div>

          {/* Performance Metrics Preview */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Estimated Performance
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">~2s</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Latency</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">$0.015</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Per Request</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">99.9%</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Uptime</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TechnicalCluster;
