/**
 * AgentOS Ops Console - Safety Cluster
 * Configuration for guardrails, PII handling, and blocklists
 */

'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrayField, ArrayItem } from '../fields/ArrayField';
import { SliderField } from '../fields/SliderField';
import { MultiSelect, MultiSelectOption } from '../fields/MultiSelect';
import { PermissionMatrix, PermissionMatrixValue } from '../fields/PermissionMatrix';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Ban,
  FileWarning,
  UserX,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type PiiHandlingMode = 'block' | 'redact' | 'warn' | 'allow';
export type ContentFilterLevel = 'strict' | 'moderate' | 'relaxed' | 'off';

export interface GuardrailConfig {
  enabled: boolean;
  name: string;
  type: 'input' | 'output' | 'both';
  action: 'block' | 'warn' | 'log';
}

export interface SafetyClusterValue {
  guardrails: {
    enabled: boolean;
    inputValidation: boolean;
    outputValidation: boolean;
    maxOutputLength: number;
    preventCodeExecution: boolean;
    preventSystemAccess: boolean;
    customGuardrails: GuardrailConfig[];
  };
  piiHandling: {
    mode: PiiHandlingMode;
    detectTypes: string[];
    redactionPattern: string;
    logDetections: boolean;
  };
  blocklists: {
    domains: ArrayItem[];
    keywords: ArrayItem[];
    patterns: ArrayItem[];
    filepaths: ArrayItem[];
  };
  contentFilter: {
    level: ContentFilterLevel;
    categories: string[];
  };
  zonePermissions: PermissionMatrixValue;
}

interface SafetyClusterProps {
  value: SafetyClusterValue;
  onChange: (value: SafetyClusterValue) => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const PII_TYPES: MultiSelectOption[] = [
  { value: 'email', label: 'Email Addresses' },
  { value: 'phone', label: 'Phone Numbers' },
  { value: 'ssn', label: 'Social Security Numbers' },
  { value: 'credit_card', label: 'Credit Card Numbers' },
  { value: 'address', label: 'Physical Addresses' },
  { value: 'name', label: 'Personal Names' },
  { value: 'dob', label: 'Dates of Birth' },
  { value: 'ip_address', label: 'IP Addresses' },
  { value: 'api_key', label: 'API Keys' },
  { value: 'password', label: 'Passwords' },
];

const CONTENT_CATEGORIES: MultiSelectOption[] = [
  { value: 'violence', label: 'Violence' },
  { value: 'hate_speech', label: 'Hate Speech' },
  { value: 'adult', label: 'Adult Content' },
  { value: 'self_harm', label: 'Self-Harm' },
  { value: 'illegal', label: 'Illegal Activities' },
  { value: 'spam', label: 'Spam' },
  { value: 'misinformation', label: 'Misinformation' },
];

const PII_MODES: { value: PiiHandlingMode; label: string; description: string; color: string }[] = [
  { value: 'block', label: 'Block', description: 'Stop execution if PII detected', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
  { value: 'redact', label: 'Redact', description: 'Replace PII with placeholders', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  { value: 'warn', label: 'Warn', description: 'Log warning but continue', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  { value: 'allow', label: 'Allow', description: 'No PII handling', color: 'bg-slate-100 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300' },
];

const CONTENT_FILTER_LEVELS: { value: ContentFilterLevel; label: string; description: string }[] = [
  { value: 'strict', label: 'Strict', description: 'Maximum content filtering' },
  { value: 'moderate', label: 'Moderate', description: 'Balanced filtering' },
  { value: 'relaxed', label: 'Relaxed', description: 'Minimal filtering' },
  { value: 'off', label: 'Off', description: 'No content filtering' },
];

// ============================================
// Safety Cluster Component
// ============================================

export function SafetyCluster({
  value,
  onChange,
  disabled = false,
  className,
}: SafetyClusterProps) {
  const updateGuardrails = (updates: Partial<typeof value.guardrails>) => {
    onChange({ ...value, guardrails: { ...value.guardrails, ...updates } });
  };

  const updatePiiHandling = (updates: Partial<typeof value.piiHandling>) => {
    onChange({ ...value, piiHandling: { ...value.piiHandling, ...updates } });
  };

  const updateBlocklists = (updates: Partial<typeof value.blocklists>) => {
    onChange({ ...value, blocklists: { ...value.blocklists, ...updates } });
  };

  const updateContentFilter = (updates: Partial<typeof value.contentFilter>) => {
    onChange({ ...value, contentFilter: { ...value.contentFilter, ...updates } });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20">
            <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <CardTitle>Safety & Security</CardTitle>
            <CardDescription>
              Configure guardrails, PII handling, blocklists, and zone permissions
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Guardrails */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-slate-500" />
              <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
                Guardrails
              </h4>
            </div>
            <button
              type="button"
              onClick={() => updateGuardrails({ enabled: !value.guardrails.enabled })}
              disabled={disabled}
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                value.guardrails.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  value.guardrails.enabled ? 'left-6' : 'left-1'
                )}
              />
            </button>
          </div>

          {value.guardrails.enabled && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-dark-border-secondary cursor-pointer hover:bg-white dark:hover:bg-dark-bg-secondary">
                  <input
                    type="checkbox"
                    checked={value.guardrails.inputValidation}
                    onChange={(e) => updateGuardrails({ inputValidation: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <div className="font-medium text-sm">Input Validation</div>
                    <div className="text-xs text-slate-500">Validate user inputs</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-dark-border-secondary cursor-pointer hover:bg-white dark:hover:bg-dark-bg-secondary">
                  <input
                    type="checkbox"
                    checked={value.guardrails.outputValidation}
                    onChange={(e) => updateGuardrails({ outputValidation: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <div className="font-medium text-sm">Output Validation</div>
                    <div className="text-xs text-slate-500">Validate agent outputs</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-dark-border-secondary cursor-pointer hover:bg-white dark:hover:bg-dark-bg-secondary">
                  <input
                    type="checkbox"
                    checked={value.guardrails.preventCodeExecution}
                    onChange={(e) => updateGuardrails({ preventCodeExecution: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <div className="font-medium text-sm">Prevent Code Execution</div>
                    <div className="text-xs text-slate-500">Block dangerous code</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-dark-border-secondary cursor-pointer hover:bg-white dark:hover:bg-dark-bg-secondary">
                  <input
                    type="checkbox"
                    checked={value.guardrails.preventSystemAccess}
                    onChange={(e) => updateGuardrails({ preventSystemAccess: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <div className="font-medium text-sm">Prevent System Access</div>
                    <div className="text-xs text-slate-500">Block system commands</div>
                  </div>
                </label>
              </div>

              <SliderField
                label="Max Output Length"
                value={value.guardrails.maxOutputLength}
                onChange={(maxOutputLength) => updateGuardrails({ maxOutputLength })}
                min={1000}
                max={100000}
                step={1000}
                valueFormatter={(v) => `${(v / 1000).toFixed(0)}K chars`}
                disabled={disabled}
              />
            </div>
          )}
        </div>

        {/* PII Handling */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center gap-2 mb-4">
            <EyeOff className="w-5 h-5 text-slate-500" />
            <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
              PII Handling
            </h4>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {PII_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => updatePiiHandling({ mode: mode.value })}
                disabled={disabled}
                className={cn(
                  'p-3 rounded-lg border text-left transition-colors',
                  value.piiHandling.mode === mode.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-slate-200 dark:border-dark-border-secondary hover:border-slate-300'
                )}
              >
                <Badge size="sm" className={mode.color}>
                  {mode.label}
                </Badge>
                <div className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-2">
                  {mode.description}
                </div>
              </button>
            ))}
          </div>

          {value.piiHandling.mode !== 'allow' && (
            <>
              <MultiSelect
                label="PII Types to Detect"
                options={PII_TYPES}
                value={value.piiHandling.detectTypes}
                onChange={(detectTypes) => updatePiiHandling({ detectTypes })}
                disabled={disabled}
                placeholder="Select PII types..."
              />

              {value.piiHandling.mode === 'redact' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                    Redaction Pattern
                  </label>
                  <input
                    type="text"
                    value={value.piiHandling.redactionPattern}
                    onChange={(e) => updatePiiHandling({ redactionPattern: e.target.value })}
                    placeholder="[REDACTED]"
                    disabled={disabled}
                    className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-secondary"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.piiHandling.logDetections}
                  onChange={(e) => updatePiiHandling({ logDetections: e.target.checked })}
                  disabled={disabled}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                  Log PII detections (without PII content)
                </span>
              </label>
            </>
          )}
        </div>

        {/* Content Filter */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center gap-2 mb-4">
            <FileWarning className="w-5 h-5 text-slate-500" />
            <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
              Content Filter
            </h4>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {CONTENT_FILTER_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => updateContentFilter({ level: level.value })}
                disabled={disabled}
                className={cn(
                  'p-3 rounded-lg border text-left transition-colors',
                  value.contentFilter.level === level.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-slate-200 dark:border-dark-border-secondary hover:border-slate-300'
                )}
              >
                <div className="font-medium text-slate-900 dark:text-dark-text-primary">
                  {level.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-1">
                  {level.description}
                </div>
              </button>
            ))}
          </div>

          {value.contentFilter.level !== 'off' && (
            <MultiSelect
              label="Filter Categories"
              options={CONTENT_CATEGORIES}
              value={value.contentFilter.categories}
              onChange={(categories) => updateContentFilter({ categories })}
              disabled={disabled}
              placeholder="Select categories to filter..."
            />
          )}
        </div>

        {/* Blocklists */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center gap-2 mb-4">
            <Ban className="w-5 h-5 text-slate-500" />
            <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
              Blocklists
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ArrayField
              label="Blocked Domains"
              value={value.blocklists.domains}
              onChange={(domains) => updateBlocklists({ domains })}
              placeholder="example.com"
              disabled={disabled}
            />
            <ArrayField
              label="Blocked Keywords"
              value={value.blocklists.keywords}
              onChange={(keywords) => updateBlocklists({ keywords })}
              placeholder="keyword"
              disabled={disabled}
            />
            <ArrayField
              label="Blocked Patterns (Regex)"
              value={value.blocklists.patterns}
              onChange={(patterns) => updateBlocklists({ patterns })}
              placeholder="^secret.*"
              disabled={disabled}
            />
            <ArrayField
              label="Blocked File Paths"
              value={value.blocklists.filepaths}
              onChange={(filepaths) => updateBlocklists({ filepaths })}
              placeholder="/etc/passwd"
              disabled={disabled}
            />
          </div>
        </div>

        {/* Zone Permissions */}
        <PermissionMatrix
          label="Zone Access Permissions"
          value={value.zonePermissions}
          onChange={(zonePermissions) => onChange({ ...value, zonePermissions })}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}

export default SafetyCluster;
