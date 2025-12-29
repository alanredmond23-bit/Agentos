/**
 * AgentOS Ops Console - Reasoning Cluster
 * Configuration for reasoning depth, chain of thought, and extended thinking
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { SliderField } from '../fields/SliderField';
import { MultiSelect, MultiSelectOption } from '../fields/MultiSelect';
import {
  Lightbulb,
  GitBranch,
  Brain,
  Sparkles,
  Zap,
  Timer,
  Target,
  Layers,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type ReasoningDepth = 'shallow' | 'moderate' | 'deep' | 'exhaustive';
export type ChainOfThoughtMode = 'disabled' | 'internal' | 'visible' | 'structured';

export interface ReasoningClusterValue {
  depth: ReasoningDepth;
  chainOfThought: {
    mode: ChainOfThoughtMode;
    maxSteps: number;
    showIntermediateResults: boolean;
  };
  extendedThinking: {
    enabled: boolean;
    budgetTokens: number;
    minThinkingTime: number;
    allowRefinement: boolean;
  };
  strategies: string[];
  selfReflection: boolean;
  uncertaintyHandling: 'proceed' | 'ask' | 'escalate';
}

interface ReasoningClusterProps {
  value: ReasoningClusterValue;
  onChange: (value: ReasoningClusterValue) => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const REASONING_DEPTHS: { value: ReasoningDepth; label: string; description: string; tokens: string }[] = [
  { value: 'shallow', label: 'Shallow', description: 'Quick responses, minimal analysis', tokens: '~500' },
  { value: 'moderate', label: 'Moderate', description: 'Balanced analysis and speed', tokens: '~2K' },
  { value: 'deep', label: 'Deep', description: 'Thorough multi-step reasoning', tokens: '~8K' },
  { value: 'exhaustive', label: 'Exhaustive', description: 'Maximum exploration of options', tokens: '~32K' },
];

const COT_MODES: { value: ChainOfThoughtMode; label: string; description: string }[] = [
  { value: 'disabled', label: 'Disabled', description: 'Direct responses only' },
  { value: 'internal', label: 'Internal', description: 'Reasoning hidden from user' },
  { value: 'visible', label: 'Visible', description: 'Show reasoning to user' },
  { value: 'structured', label: 'Structured', description: 'Formatted step-by-step' },
];

const REASONING_STRATEGIES: MultiSelectOption[] = [
  { value: 'divide_conquer', label: 'Divide & Conquer', description: 'Break complex problems into smaller parts' },
  { value: 'analogical', label: 'Analogical', description: 'Draw from similar past problems' },
  { value: 'counterfactual', label: 'Counterfactual', description: 'Consider alternative scenarios' },
  { value: 'abductive', label: 'Abductive', description: 'Infer best explanation from observations' },
  { value: 'constraint_based', label: 'Constraint-Based', description: 'Satisfy given constraints systematically' },
  { value: 'means_ends', label: 'Means-Ends', description: 'Work backwards from goal' },
];

// ============================================
// Reasoning Cluster Component
// ============================================

export function ReasoningCluster({
  value,
  onChange,
  disabled = false,
  className,
}: ReasoningClusterProps) {
  const updateChainOfThought = (updates: Partial<typeof value.chainOfThought>) => {
    onChange({
      ...value,
      chainOfThought: { ...value.chainOfThought, ...updates },
    });
  };

  const updateExtendedThinking = (updates: Partial<typeof value.extendedThinking>) => {
    onChange({
      ...value,
      extendedThinking: { ...value.extendedThinking, ...updates },
    });
  };

  const selectedDepth = REASONING_DEPTHS.find((d) => d.value === value.depth);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20">
            <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle>Reasoning Configuration</CardTitle>
            <CardDescription>
              Configure thinking depth, chain of thought, and reasoning strategies
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Reasoning Depth */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-slate-500" />
            <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
              Reasoning Depth
            </h4>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {REASONING_DEPTHS.map((depth) => (
              <button
                key={depth.value}
                type="button"
                onClick={() => onChange({ ...value, depth: depth.value })}
                disabled={disabled}
                className={cn(
                  'p-3 rounded-lg border text-left transition-colors',
                  value.depth === depth.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-slate-200 dark:border-dark-border-secondary hover:border-slate-300'
                )}
              >
                <div className="font-medium text-slate-900 dark:text-dark-text-primary">
                  {depth.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-1">
                  {depth.description}
                </div>
                <div className="text-xs text-brand-600 dark:text-brand-400 mt-2 font-mono">
                  {depth.tokens} tokens
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chain of Thought */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-5 h-5 text-slate-500" />
            <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
              Chain of Thought
            </h4>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {COT_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => updateChainOfThought({ mode: mode.value })}
                disabled={disabled}
                className={cn(
                  'p-3 rounded-lg border text-left transition-colors',
                  value.chainOfThought.mode === mode.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-slate-200 dark:border-dark-border-secondary hover:border-slate-300'
                )}
              >
                <div className="font-medium text-slate-900 dark:text-dark-text-primary">
                  {mode.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-1">
                  {mode.description}
                </div>
              </button>
            ))}
          </div>

          {value.chainOfThought.mode !== 'disabled' && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-dark-border-primary">
              <SliderField
                label="Max Reasoning Steps"
                value={value.chainOfThought.maxSteps}
                onChange={(maxSteps) => updateChainOfThought({ maxSteps })}
                min={1}
                max={20}
                step={1}
                disabled={disabled}
              />

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.chainOfThought.showIntermediateResults}
                  onChange={(e) =>
                    updateChainOfThought({ showIntermediateResults: e.target.checked })
                  }
                  disabled={disabled}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                  Show intermediate results
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Extended Thinking */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-slate-500" />
              <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
                Extended Thinking
              </h4>
            </div>
            <button
              type="button"
              onClick={() =>
                updateExtendedThinking({ enabled: !value.extendedThinking.enabled })
              }
              disabled={disabled}
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                value.extendedThinking.enabled
                  ? 'bg-brand-600'
                  : 'bg-slate-300 dark:bg-dark-bg-elevated'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  value.extendedThinking.enabled ? 'left-6' : 'left-1'
                )}
              />
            </button>
          </div>

          {value.extendedThinking.enabled && (
            <div className="space-y-4">
              <SliderField
                label="Thinking Budget"
                value={value.extendedThinking.budgetTokens}
                onChange={(budgetTokens) => updateExtendedThinking({ budgetTokens })}
                min={1000}
                max={100000}
                step={1000}
                valueFormatter={(v) => `${(v / 1000).toFixed(0)}K tokens`}
                marks={[
                  { value: 10000, label: '10K' },
                  { value: 50000, label: '50K' },
                  { value: 100000, label: '100K' },
                ]}
                disabled={disabled}
              />

              <SliderField
                label="Minimum Thinking Time"
                value={value.extendedThinking.minThinkingTime}
                onChange={(minThinkingTime) => updateExtendedThinking({ minThinkingTime })}
                min={0}
                max={60}
                step={5}
                valueFormatter={(v) => `${v}s`}
                disabled={disabled}
              />

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.extendedThinking.allowRefinement}
                  onChange={(e) =>
                    updateExtendedThinking({ allowRefinement: e.target.checked })
                  }
                  disabled={disabled}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                  Allow iterative refinement of thoughts
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Reasoning Strategies */}
        <MultiSelect
          label="Reasoning Strategies"
          options={REASONING_STRATEGIES}
          value={value.strategies}
          onChange={(strategies) => onChange({ ...value, strategies })}
          disabled={disabled}
          placeholder="Select reasoning strategies..."
          hint="Strategies the agent can employ for problem-solving"
        />

        {/* Additional Options */}
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-dark-border-primary cursor-pointer hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary">
            <input
              type="checkbox"
              checked={value.selfReflection}
              onChange={(e) => onChange({ ...value, selfReflection: e.target.checked })}
              disabled={disabled}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <div className="font-medium text-sm text-slate-700 dark:text-dark-text-secondary">
                Self-Reflection
              </div>
              <div className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                Agent evaluates its own responses
              </div>
            </div>
          </label>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-dark-border-primary">
            <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
              Uncertainty Handling
            </label>
            <select
              value={value.uncertaintyHandling}
              onChange={(e) =>
                onChange({ ...value, uncertaintyHandling: e.target.value as any })
              }
              disabled={disabled}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
            >
              <option value="proceed">Proceed with best guess</option>
              <option value="ask">Ask for clarification</option>
              <option value="escalate">Escalate to human</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReasoningCluster;
