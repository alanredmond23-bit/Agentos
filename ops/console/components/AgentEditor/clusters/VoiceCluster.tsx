/**
 * AgentOS Ops Console - VoiceCluster Component
 * Cluster for agent voice settings: tone, vocabulary, constraints
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, MessageSquare, Volume2 } from 'lucide-react';
import { TextField } from '../fields/TextField';
import { SelectField, SelectOption } from '../fields/SelectField';
import { TagInput } from '../fields/TagInput';
import { ToggleField } from '../fields/ToggleField';

// ============================================
// VoiceCluster Types
// ============================================

export interface VoiceClusterProps {
  isExpanded?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const TONE_OPTIONS: SelectOption[] = [
  { value: 'formal', label: 'Formal', description: 'Professional and business-appropriate' },
  { value: 'casual', label: 'Casual', description: 'Friendly and conversational' },
  { value: 'technical', label: 'Technical', description: 'Precise and domain-specific' },
  { value: 'empathetic', label: 'Empathetic', description: 'Warm and understanding' },
  { value: 'direct', label: 'Direct', description: 'Concise and to-the-point' },
  { value: 'educational', label: 'Educational', description: 'Instructive and explanatory' },
  { value: 'neutral', label: 'Neutral', description: 'Balanced and objective' },
];

const VOCABULARY_LEVEL_OPTIONS: SelectOption[] = [
  { value: 'simple', label: 'Simple', description: 'Easy to understand, basic terms' },
  { value: 'standard', label: 'Standard', description: 'Common business vocabulary' },
  { value: 'technical', label: 'Technical', description: 'Domain-specific terminology' },
  { value: 'expert', label: 'Expert', description: 'Advanced technical jargon' },
];

const CONSTRAINT_SUGGESTIONS = [
  'no-emojis',
  'markdown-only',
  'no-code-blocks',
  'max-500-words',
  'bullet-points',
  'no-personal-opinions',
  'cite-sources',
  'avoid-jargon',
  'no-speculation',
  'formal-greetings',
  'include-examples',
  'step-by-step',
];

const VOCABULARY_SUGGESTIONS = [
  'API',
  'SDK',
  'deployment',
  'integration',
  'microservices',
  'containerization',
  'orchestration',
  'pipeline',
  'authentication',
  'authorization',
  'scalability',
  'resilience',
];

// ============================================
// VoiceCluster Component
// ============================================

export function VoiceCluster({
  isExpanded = true,
  onToggle,
  disabled = false,
  className,
}: VoiceClusterProps) {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  const expanded = onToggle ? isExpanded : localExpanded;
  const handleToggle = onToggle || (() => setLocalExpanded(!localExpanded));

  return (
    <div className={cn('border border-slate-200 dark:border-dark-border-primary rounded-lg overflow-hidden', className)}>
      {/* Cluster Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-dark-bg-tertiary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20">
            <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
              Voice
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
              Tone, vocabulary, and communication constraints
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
          {/* Tone */}
          <SelectField
            name="voice.tone"
            label="Tone"
            options={TONE_OPTIONS}
            placeholder="Select communication tone"
            helpText="The overall emotional quality and style of the agent's responses"
            required
            disabled={disabled}
          />

          {/* Vocabulary Level */}
          <SelectField
            name="voice.vocabulary_level"
            label="Vocabulary Level"
            options={VOCABULARY_LEVEL_OPTIONS}
            placeholder="Select vocabulary complexity"
            helpText="The complexity of language and terminology used"
            disabled={disabled}
          />

          {/* Custom Vocabulary */}
          <TagInput
            name="voice.custom_vocabulary"
            label="Custom Vocabulary"
            placeholder="Add domain-specific terms..."
            helpText="Specific terms or phrases the agent should use correctly"
            disabled={disabled}
            suggestions={VOCABULARY_SUGGESTIONS}
            maxTags={20}
          />

          {/* Response Template */}
          <TextField
            name="voice.response_template"
            label="Response Template"
            placeholder="Start with a greeting, then provide analysis, end with next steps..."
            helpText="Optional structure or format the agent should follow in responses"
            disabled={disabled}
            multiline
            rows={3}
            maxLength={500}
          />

          {/* Constraints */}
          <TagInput
            name="voice.constraints"
            label="Communication Constraints"
            placeholder="Add constraints..."
            helpText="Rules or limitations on how the agent should communicate"
            disabled={disabled}
            suggestions={CONSTRAINT_SUGGESTIONS}
            maxTags={15}
          />

          {/* Voice Options */}
          <div className="pt-4 border-t border-slate-100 dark:border-dark-border-secondary space-y-3">
            <ToggleField
              name="voice.use_markdown"
              label="Use Markdown"
              description="Format responses with markdown syntax"
              disabled={disabled}
            />

            <ToggleField
              name="voice.include_citations"
              label="Include Citations"
              description="Reference sources and documentation in responses"
              disabled={disabled}
            />

            <ToggleField
              name="voice.allow_code_snippets"
              label="Allow Code Snippets"
              description="Include code examples in responses when relevant"
              disabled={disabled}
            />
          </div>

          {/* Voice Preview */}
          <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-500/10 rounded-lg border border-purple-100 dark:border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                Voice Preview
              </span>
            </div>
            <p className="text-sm text-purple-900 dark:text-purple-100 italic">
              "The agent will communicate in a structured, clear manner following the configured tone and constraints."
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default VoiceCluster;
