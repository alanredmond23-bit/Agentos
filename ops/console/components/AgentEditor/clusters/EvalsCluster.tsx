/**
 * AgentOS Ops Console - Evals Cluster
 * Configuration for evaluation criteria, benchmarks, and quality metrics
 */

'use client';

import React, { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SliderField } from '../fields/SliderField';
import { MultiSelect, MultiSelectOption } from '../fields/MultiSelect';
import { KeyValueEditor, KeyValuePair } from '../fields/KeyValueEditor';
import {
  Target,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart2,
  Zap,
  Clock,
  DollarSign,
  MessageSquare,
  Sparkles,
  LineChart,
  Play,
  Pause,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type EvalCategory = 'accuracy' | 'safety' | 'quality' | 'performance' | 'custom';
export type EvalFrequency = 'on_deploy' | 'scheduled' | 'continuous' | 'manual';
export type EvalSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface EvalCriterion {
  id: string;
  name: string;
  category: EvalCategory;
  enabled: boolean;
  description: string;
  weight: number;
  threshold: number;
  currentScore?: number;
  lastEvaluated?: string;
}

export interface BenchmarkSuite {
  id: string;
  name: string;
  enabled: boolean;
  testCases: number;
  passThreshold: number;
  lastRun?: string;
  lastResult?: {
    passed: number;
    failed: number;
    score: number;
  };
}

export interface QualityMetric {
  id: string;
  name: string;
  type: 'latency' | 'cost' | 'tokens' | 'errors' | 'custom';
  enabled: boolean;
  target: number;
  alertThreshold: number;
  currentValue?: number;
}

export interface EvalsClusterValue {
  evaluations: {
    enabled: boolean;
    frequency: EvalFrequency;
    criteria: EvalCriterion[];
  };
  benchmarks: {
    enabled: boolean;
    suites: BenchmarkSuite[];
    runOnDeploy: boolean;
    blockOnFailure: boolean;
  };
  qualityMetrics: {
    enabled: boolean;
    metrics: QualityMetric[];
    aggregationPeriod: number;
  };
  alerts: {
    enabled: boolean;
    notifyOnFailure: boolean;
    notifyOnDegradation: boolean;
    degradationThreshold: number;
  };
}

interface EvalsClusterProps {
  value: EvalsClusterValue;
  onChange: (value: EvalsClusterValue) => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const EVAL_CATEGORIES: { value: EvalCategory; label: string; color: string; icon: React.ElementType }[] = [
  { value: 'accuracy', label: 'Accuracy', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400', icon: Target },
  { value: 'safety', label: 'Safety', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400', icon: AlertTriangle },
  { value: 'quality', label: 'Quality', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', icon: Sparkles },
  { value: 'performance', label: 'Performance', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400', icon: Zap },
  { value: 'custom', label: 'Custom', color: 'bg-slate-100 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300', icon: BarChart2 },
];

const EVAL_FREQUENCIES: { value: EvalFrequency; label: string; description: string }[] = [
  { value: 'on_deploy', label: 'On Deploy', description: 'Run evaluations when agent is deployed' },
  { value: 'scheduled', label: 'Scheduled', description: 'Run on a regular schedule' },
  { value: 'continuous', label: 'Continuous', description: 'Evaluate every response' },
  { value: 'manual', label: 'Manual', description: 'Run only when triggered' },
];

const PRESET_CRITERIA: Partial<EvalCriterion>[] = [
  { name: 'Factual Accuracy', category: 'accuracy', description: 'Responses are factually correct', threshold: 90 },
  { name: 'Relevance', category: 'accuracy', description: 'Responses are relevant to the query', threshold: 85 },
  { name: 'Harmful Content', category: 'safety', description: 'No harmful or dangerous content', threshold: 99 },
  { name: 'PII Protection', category: 'safety', description: 'No PII leakage in responses', threshold: 100 },
  { name: 'Coherence', category: 'quality', description: 'Responses are coherent and well-structured', threshold: 80 },
  { name: 'Helpfulness', category: 'quality', description: 'Responses are helpful to the user', threshold: 85 },
  { name: 'Response Time', category: 'performance', description: 'Responses are generated quickly', threshold: 95 },
  { name: 'Token Efficiency', category: 'performance', description: 'Efficient use of tokens', threshold: 80 },
];

const METRIC_TYPES: { value: QualityMetric['type']; label: string; icon: React.ElementType; unit: string }[] = [
  { value: 'latency', label: 'Latency', icon: Clock, unit: 'ms' },
  { value: 'cost', label: 'Cost', icon: DollarSign, unit: '$' },
  { value: 'tokens', label: 'Tokens', icon: MessageSquare, unit: 'tokens' },
  { value: 'errors', label: 'Error Rate', icon: XCircle, unit: '%' },
  { value: 'custom', label: 'Custom', icon: BarChart2, unit: '' },
];

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return `eval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getCategoryConfig(category: EvalCategory) {
  return EVAL_CATEGORIES.find((c) => c.value === category) || EVAL_CATEGORIES[4];
}

function getMetricTypeConfig(type: QualityMetric['type']) {
  return METRIC_TYPES.find((t) => t.value === type) || METRIC_TYPES[4];
}

function getScoreColor(score: number, threshold: number): string {
  const ratio = score / threshold;
  if (ratio >= 1) return 'text-emerald-600 dark:text-emerald-400';
  if (ratio >= 0.9) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

// ============================================
// Criterion Item Component
// ============================================

interface CriterionItemProps {
  criterion: EvalCriterion;
  onUpdate: (updates: Partial<EvalCriterion>) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function CriterionItem({ criterion, onUpdate, onRemove, disabled }: CriterionItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const categoryConfig = getCategoryConfig(criterion.category);
  const CategoryIcon = categoryConfig.icon;

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden',
        'border-slate-200 dark:border-dark-border-primary',
        'bg-white dark:bg-dark-bg-secondary',
        !criterion.enabled && 'opacity-60',
        disabled && 'opacity-50'
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ enabled: !criterion.enabled });
          }}
          disabled={disabled}
          className={cn(
            'w-8 h-5 rounded-full transition-colors relative',
            criterion.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
              criterion.enabled ? 'left-3.5' : 'left-0.5'
            )}
          />
        </button>

        <div className={cn('p-1 rounded', categoryConfig.color.split(' ')[0])}>
          <CategoryIcon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-slate-900 dark:text-dark-text-primary">
              {criterion.name || 'Unnamed Criterion'}
            </span>
            <Badge size="sm" className={categoryConfig.color}>
              {categoryConfig.label}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {criterion.currentScore !== undefined && (
            <span className={cn('text-sm font-medium', getScoreColor(criterion.currentScore, criterion.threshold))}>
              {criterion.currentScore}%
            </span>
          )}
          <span className="text-xs text-slate-400">
            Target: {criterion.threshold}%
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            disabled={disabled}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-dark-border-primary p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={criterion.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Criterion name"
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Category
              </label>
              <select
                value={criterion.category}
                onChange={(e) => onUpdate({ category: e.target.value as EvalCategory })}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              >
                {EVAL_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
              Description
            </label>
            <textarea
              value={criterion.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="What this criterion evaluates..."
              disabled={disabled}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SliderField
              label="Weight"
              value={criterion.weight}
              onChange={(weight) => onUpdate({ weight })}
              min={0}
              max={100}
              step={5}
              valueFormatter={(v) => `${v}%`}
              disabled={disabled}
            />

            <SliderField
              label="Threshold"
              value={criterion.threshold}
              onChange={(threshold) => onUpdate({ threshold })}
              min={0}
              max={100}
              step={5}
              valueFormatter={(v) => `${v}%`}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Evals Cluster Component
// ============================================

export function EvalsCluster({
  value,
  onChange,
  disabled = false,
  className,
}: EvalsClusterProps) {
  const [showPresets, setShowPresets] = useState(false);

  const updateEvaluations = (updates: Partial<typeof value.evaluations>) => {
    onChange({ ...value, evaluations: { ...value.evaluations, ...updates } });
  };

  const updateBenchmarks = (updates: Partial<typeof value.benchmarks>) => {
    onChange({ ...value, benchmarks: { ...value.benchmarks, ...updates } });
  };

  const updateQualityMetrics = (updates: Partial<typeof value.qualityMetrics>) => {
    onChange({ ...value, qualityMetrics: { ...value.qualityMetrics, ...updates } });
  };

  const updateAlerts = (updates: Partial<typeof value.alerts>) => {
    onChange({ ...value, alerts: { ...value.alerts, ...updates } });
  };

  const addCriterion = useCallback(
    (preset?: Partial<EvalCriterion>) => {
      const newCriterion: EvalCriterion = {
        id: generateId(),
        name: preset?.name || '',
        category: preset?.category || 'custom',
        enabled: true,
        description: preset?.description || '',
        weight: 100,
        threshold: preset?.threshold || 80,
      };
      updateEvaluations({ criteria: [...value.evaluations.criteria, newCriterion] });
      setShowPresets(false);
    },
    [value.evaluations.criteria, updateEvaluations]
  );

  const updateCriterion = useCallback(
    (id: string, updates: Partial<EvalCriterion>) => {
      updateEvaluations({
        criteria: value.evaluations.criteria.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      });
    },
    [value.evaluations.criteria, updateEvaluations]
  );

  const removeCriterion = useCallback(
    (id: string) => {
      updateEvaluations({
        criteria: value.evaluations.criteria.filter((c) => c.id !== id),
      });
    },
    [value.evaluations.criteria, updateEvaluations]
  );

  const addBenchmarkSuite = useCallback(() => {
    const newSuite: BenchmarkSuite = {
      id: generateId(),
      name: '',
      enabled: true,
      testCases: 0,
      passThreshold: 80,
    };
    updateBenchmarks({ suites: [...value.benchmarks.suites, newSuite] });
  }, [value.benchmarks.suites, updateBenchmarks]);

  const updateBenchmarkSuite = useCallback(
    (id: string, updates: Partial<BenchmarkSuite>) => {
      updateBenchmarks({
        suites: value.benchmarks.suites.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      });
    },
    [value.benchmarks.suites, updateBenchmarks]
  );

  const removeBenchmarkSuite = useCallback(
    (id: string) => {
      updateBenchmarks({
        suites: value.benchmarks.suites.filter((s) => s.id !== id),
      });
    },
    [value.benchmarks.suites, updateBenchmarks]
  );

  const addQualityMetric = useCallback(() => {
    const newMetric: QualityMetric = {
      id: generateId(),
      name: '',
      type: 'latency',
      enabled: true,
      target: 1000,
      alertThreshold: 2000,
    };
    updateQualityMetrics({ metrics: [...value.qualityMetrics.metrics, newMetric] });
  }, [value.qualityMetrics.metrics, updateQualityMetrics]);

  const updateQualityMetric = useCallback(
    (id: string, updates: Partial<QualityMetric>) => {
      updateQualityMetrics({
        metrics: value.qualityMetrics.metrics.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      });
    },
    [value.qualityMetrics.metrics, updateQualityMetrics]
  );

  const removeQualityMetric = useCallback(
    (id: string) => {
      updateQualityMetrics({
        metrics: value.qualityMetrics.metrics.filter((m) => m.id !== id),
      });
    },
    [value.qualityMetrics.metrics, updateQualityMetrics]
  );

  const overallScore = value.evaluations.criteria.length > 0
    ? Math.round(
        value.evaluations.criteria
          .filter((c) => c.enabled && c.currentScore !== undefined)
          .reduce((sum, c) => sum + (c.currentScore || 0), 0) /
        value.evaluations.criteria.filter((c) => c.enabled && c.currentScore !== undefined).length || 0
      )
    : null;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
            <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <CardTitle>Evaluations & Benchmarks</CardTitle>
            <CardDescription>
              Configure evaluation criteria, benchmarks, and quality metrics
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="flex items-center gap-6 p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold',
              overallScore !== null && overallScore >= 80
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                : overallScore !== null && overallScore >= 60
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
            )}>
              {overallScore !== null ? `${overallScore}%` : '--'}
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                Overall Score
              </div>
              <div className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                Based on {value.evaluations.criteria.filter((c) => c.enabled).length} criteria
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-medium text-slate-900 dark:text-dark-text-primary">
                {value.evaluations.criteria.length}
              </div>
              <div className="text-xs text-slate-500">Criteria</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-medium text-slate-900 dark:text-dark-text-primary">
                {value.benchmarks.suites.length}
              </div>
              <div className="text-xs text-slate-500">Benchmarks</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-medium text-slate-900 dark:text-dark-text-primary">
                {value.qualityMetrics.metrics.length}
              </div>
              <div className="text-xs text-slate-500">Metrics</div>
            </div>
          </div>
        </div>

        {/* Evaluation Criteria */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-slate-500" />
              <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
                Evaluation Criteria
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={value.evaluations.frequency}
                onChange={(e) => updateEvaluations({ frequency: e.target.value as EvalFrequency })}
                disabled={disabled}
                className="px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-secondary"
              >
                {EVAL_FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => updateEvaluations({ enabled: !value.evaluations.enabled })}
                disabled={disabled}
                className={cn(
                  'w-12 h-7 rounded-full transition-colors relative',
                  value.evaluations.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                    value.evaluations.enabled ? 'left-6' : 'left-1'
                  )}
                />
              </button>
            </div>
          </div>

          {value.evaluations.enabled && (
            <>
              <div className="relative mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => addCriterion()}
                    disabled={disabled}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Add Criterion
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPresets(!showPresets)}
                    disabled={disabled}
                  >
                    Presets
                    <ChevronDown className={cn('w-4 h-4 ml-1 transition-transform', showPresets && 'rotate-180')} />
                  </Button>
                </div>

                {showPresets && (
                  <div className="absolute z-10 mt-2 w-80 max-h-60 overflow-auto rounded-lg border border-slate-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary shadow-lg">
                    {PRESET_CRITERIA.map((preset, index) => {
                      const catConfig = getCategoryConfig(preset.category!);
                      const CatIcon = catConfig.icon;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => addCriterion(preset)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary text-left"
                        >
                          <CatIcon className={cn('w-4 h-4', catConfig.color.split(' ').slice(1).join(' '))} />
                          <div className="flex-1">
                            <div className="font-medium text-sm text-slate-900 dark:text-dark-text-primary">
                              {preset.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                              {preset.description}
                            </div>
                          </div>
                          <Badge size="sm" className={catConfig.color}>
                            {catConfig.label}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {value.evaluations.criteria.map((criterion) => (
                  <CriterionItem
                    key={criterion.id}
                    criterion={criterion}
                    onUpdate={(updates) => updateCriterion(criterion.id, updates)}
                    onRemove={() => removeCriterion(criterion.id)}
                    disabled={disabled}
                  />
                ))}
              </div>

              {value.evaluations.criteria.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-dark-border-primary rounded-lg">
                  <Target className="w-8 h-8 text-slate-300 dark:text-dark-text-muted mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                    No evaluation criteria defined
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Benchmark Suites */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-slate-500" />
              <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
                Benchmark Suites
              </h4>
            </div>
            <button
              type="button"
              onClick={() => updateBenchmarks({ enabled: !value.benchmarks.enabled })}
              disabled={disabled}
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                value.benchmarks.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  value.benchmarks.enabled ? 'left-6' : 'left-1'
                )}
              />
            </button>
          </div>

          {value.benchmarks.enabled && (
            <>
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value.benchmarks.runOnDeploy}
                    onChange={(e) => updateBenchmarks({ runOnDeploy: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                    Run on deploy
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value.benchmarks.blockOnFailure}
                    onChange={(e) => updateBenchmarks({ blockOnFailure: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                    Block deploy on failure
                  </span>
                </label>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addBenchmarkSuite}
                disabled={disabled}
                leftIcon={<Plus className="w-4 h-4" />}
                className="mb-4"
              >
                Add Suite
              </Button>

              <div className="space-y-3">
                {value.benchmarks.suites.map((suite) => (
                  <div
                    key={suite.id}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-lg border',
                      'border-slate-200 dark:border-dark-border-secondary',
                      'bg-white dark:bg-dark-bg-secondary',
                      !suite.enabled && 'opacity-60'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => updateBenchmarkSuite(suite.id, { enabled: !suite.enabled })}
                      disabled={disabled}
                      className={cn(
                        'w-8 h-5 rounded-full transition-colors relative',
                        suite.enabled ? 'bg-brand-600' : 'bg-slate-300'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                          suite.enabled ? 'left-3.5' : 'left-0.5'
                        )}
                      />
                    </button>

                    <input
                      type="text"
                      value={suite.name}
                      onChange={(e) => updateBenchmarkSuite(suite.id, { name: e.target.value })}
                      placeholder="Suite name"
                      disabled={disabled}
                      className="flex-1 px-2 py-1 text-sm rounded border border-slate-200 dark:border-dark-border-secondary"
                    />

                    <input
                      type="number"
                      value={suite.testCases}
                      onChange={(e) => updateBenchmarkSuite(suite.id, { testCases: parseInt(e.target.value) || 0 })}
                      min={0}
                      placeholder="Tests"
                      disabled={disabled}
                      className="w-20 px-2 py-1 text-sm rounded border border-slate-200 dark:border-dark-border-secondary"
                    />

                    <input
                      type="number"
                      value={suite.passThreshold}
                      onChange={(e) => updateBenchmarkSuite(suite.id, { passThreshold: parseInt(e.target.value) || 80 })}
                      min={0}
                      max={100}
                      placeholder="Threshold"
                      disabled={disabled}
                      className="w-20 px-2 py-1 text-sm rounded border border-slate-200 dark:border-dark-border-secondary"
                    />

                    {suite.lastResult && (
                      <Badge
                        size="sm"
                        className={
                          suite.lastResult.score >= suite.passThreshold
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }
                      >
                        {suite.lastResult.passed}/{suite.lastResult.passed + suite.lastResult.failed}
                      </Badge>
                    )}

                    <button
                      type="button"
                      onClick={() => removeBenchmarkSuite(suite.id)}
                      disabled={disabled}
                      className="p-1 rounded text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {value.benchmarks.suites.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">
                  No benchmark suites configured
                </p>
              )}
            </>
          )}
        </div>

        {/* Quality Metrics */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-slate-500" />
              <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
                Quality Metrics
              </h4>
            </div>
            <button
              type="button"
              onClick={() => updateQualityMetrics({ enabled: !value.qualityMetrics.enabled })}
              disabled={disabled}
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                value.qualityMetrics.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  value.qualityMetrics.enabled ? 'left-6' : 'left-1'
                )}
              />
            </button>
          </div>

          {value.qualityMetrics.enabled && (
            <>
              <SliderField
                label="Aggregation Period"
                value={value.qualityMetrics.aggregationPeriod}
                onChange={(aggregationPeriod) => updateQualityMetrics({ aggregationPeriod })}
                min={1}
                max={60}
                step={1}
                valueFormatter={(v) => `${v} min`}
                disabled={disabled}
                className="mb-4"
              />

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addQualityMetric}
                disabled={disabled}
                leftIcon={<Plus className="w-4 h-4" />}
                className="mb-4"
              >
                Add Metric
              </Button>

              <div className="space-y-3">
                {value.qualityMetrics.metrics.map((metric) => {
                  const typeConfig = getMetricTypeConfig(metric.type);
                  const TypeIcon = typeConfig.icon;

                  return (
                    <div
                      key={metric.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border',
                        'border-slate-200 dark:border-dark-border-secondary',
                        'bg-white dark:bg-dark-bg-secondary',
                        !metric.enabled && 'opacity-60'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => updateQualityMetric(metric.id, { enabled: !metric.enabled })}
                        disabled={disabled}
                        className={cn(
                          'w-8 h-5 rounded-full transition-colors relative',
                          metric.enabled ? 'bg-brand-600' : 'bg-slate-300'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                            metric.enabled ? 'left-3.5' : 'left-0.5'
                          )}
                        />
                      </button>

                      <TypeIcon className="w-4 h-4 text-slate-400" />

                      <input
                        type="text"
                        value={metric.name}
                        onChange={(e) => updateQualityMetric(metric.id, { name: e.target.value })}
                        placeholder="Metric name"
                        disabled={disabled}
                        className="flex-1 px-2 py-1 text-sm rounded border border-slate-200 dark:border-dark-border-secondary"
                      />

                      <select
                        value={metric.type}
                        onChange={(e) => updateQualityMetric(metric.id, { type: e.target.value as QualityMetric['type'] })}
                        disabled={disabled}
                        className="w-24 px-2 py-1 text-sm rounded border border-slate-200 dark:border-dark-border-secondary"
                      >
                        {METRIC_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={metric.target}
                          onChange={(e) => updateQualityMetric(metric.id, { target: parseFloat(e.target.value) || 0 })}
                          placeholder="Target"
                          disabled={disabled}
                          className="w-20 px-2 py-1 text-sm rounded border border-slate-200 dark:border-dark-border-secondary"
                        />
                        <span className="text-xs text-slate-400">{typeConfig.unit}</span>
                      </div>

                      {metric.currentValue !== undefined && (
                        <span className={cn(
                          'text-sm font-medium',
                          metric.currentValue <= metric.target
                            ? 'text-emerald-600'
                            : metric.currentValue <= metric.alertThreshold
                            ? 'text-amber-600'
                            : 'text-red-600'
                        )}>
                          {metric.currentValue}{typeConfig.unit}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removeQualityMetric(metric.id)}
                        disabled={disabled}
                        className="p-1 rounded text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {value.qualityMetrics.metrics.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">
                  No quality metrics configured
                </p>
              )}
            </>
          )}
        </div>

        {/* Alerts */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-slate-500" />
              <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
                Alerting
              </h4>
            </div>
            <button
              type="button"
              onClick={() => updateAlerts({ enabled: !value.alerts.enabled })}
              disabled={disabled}
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                value.alerts.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  value.alerts.enabled ? 'left-6' : 'left-1'
                )}
              />
            </button>
          </div>

          {value.alerts.enabled && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-dark-border-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value.alerts.notifyOnFailure}
                    onChange={(e) => updateAlerts({ notifyOnFailure: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm">Notify on failure</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-dark-border-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value.alerts.notifyOnDegradation}
                    onChange={(e) => updateAlerts({ notifyOnDegradation: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm">Notify on degradation</span>
                </label>
              </div>

              {value.alerts.notifyOnDegradation && (
                <SliderField
                  label="Degradation Threshold"
                  value={value.alerts.degradationThreshold}
                  onChange={(degradationThreshold) => updateAlerts({ degradationThreshold })}
                  min={5}
                  max={50}
                  step={5}
                  valueFormatter={(v) => `${v}%`}
                  hint="Alert when score drops by this percentage"
                  disabled={disabled}
                />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default EvalsCluster;
