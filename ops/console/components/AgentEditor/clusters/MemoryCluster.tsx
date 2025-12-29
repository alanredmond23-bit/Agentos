/**
 * AgentOS Ops Console - Memory Cluster
 * Configuration for working, session, and long-term memory
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
// Card components unused after collapsible refactor
import { SliderField } from '../fields/SliderField';
import { MultiSelect, MultiSelectOption } from '../fields/MultiSelect';
import {
  Brain,
  Clock,
  Database,
  Cpu,
  Trash2,
  Settings2,
  Zap,
  HardDrive,
  ChevronDown,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export interface WorkingMemoryConfig {
  enabled: boolean;
  maxTokens: number;
  compressionEnabled: boolean;
  compressionThreshold: number;
}

export interface SessionMemoryConfig {
  enabled: boolean;
  ttlMinutes: number;
  maxEntries: number;
  persistOnClose: boolean;
  includeSystemMessages: boolean;
}

export interface LongTermMemoryConfig {
  enabled: boolean;
  provider: 'local' | 'pinecone' | 'weaviate' | 'qdrant' | 'supabase';
  indexName: string;
  embeddingModel: string;
  maxRetrievedDocs: number;
  similarityThreshold: number;
  autoIndex: boolean;
  categories: string[];
}

export interface MemoryClusterValue {
  working: WorkingMemoryConfig;
  session: SessionMemoryConfig;
  longTerm: LongTermMemoryConfig;
}

export interface MemoryClusterProps {
  value?: MemoryClusterValue;
  onChange: (value: MemoryClusterValue) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  className?: string;
}

export type WorkingMemory = WorkingMemoryConfig;
export type SessionMemory = SessionMemoryConfig;
export type LongTermMemory = LongTermMemoryConfig;

// ============================================
// Constants
// ============================================

const MEMORY_PROVIDERS: { value: string; label: string }[] = [
  { value: 'local', label: 'Local (SQLite)' },
  { value: 'pinecone', label: 'Pinecone' },
  { value: 'weaviate', label: 'Weaviate' },
  { value: 'qdrant', label: 'Qdrant' },
  { value: 'supabase', label: 'Supabase Vector' },
];

const EMBEDDING_MODELS: { value: string; label: string }[] = [
  { value: 'text-embedding-3-small', label: 'OpenAI text-embedding-3-small' },
  { value: 'text-embedding-3-large', label: 'OpenAI text-embedding-3-large' },
  { value: 'voyage-2', label: 'Voyage AI voyage-2' },
  { value: 'all-MiniLM-L6-v2', label: 'Sentence Transformers (local)' },
];

const MEMORY_CATEGORIES: MultiSelectOption[] = [
  { value: 'conversations', label: 'Conversations' },
  { value: 'code_snippets', label: 'Code Snippets' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'decisions', label: 'Decisions' },
  { value: 'errors', label: 'Errors & Solutions' },
  { value: 'user_preferences', label: 'User Preferences' },
  { value: 'project_context', label: 'Project Context' },
];

// ============================================
// Memory Section Component
// ============================================

interface MemorySectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function MemorySection({
  title,
  description,
  icon,
  iconBg,
  enabled,
  onToggle,
  disabled,
  children,
}: MemorySectionProps) {
  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden',
        'border-slate-200 dark:border-dark-border-primary',
        !enabled && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-dark-bg-tertiary">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', iconBg)}>{icon}</div>
          <div>
            <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
              {title}
            </h4>
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
              {description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          disabled={disabled}
          className={cn(
            'w-12 h-7 rounded-full transition-colors relative',
            enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
          )}
        >
          <span
            className={cn(
              'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
              enabled ? 'left-6' : 'left-1'
            )}
          />
        </button>
      </div>

      {enabled && (
        <div className="p-4 space-y-4 bg-white dark:bg-dark-bg-secondary">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================
// Memory Cluster Component
// ============================================

// Default value for initialization
const DEFAULT_MEMORY_VALUE: MemoryClusterValue = {
  working: {
    enabled: true,
    maxTokens: 32000,
    compressionEnabled: true,
    compressionThreshold: 80,
  },
  session: {
    enabled: true,
    ttlMinutes: 60,
    maxEntries: 100,
    persistOnClose: true,
    includeSystemMessages: false,
  },
  longTerm: {
    enabled: false,
    provider: 'local',
    indexName: 'agent-memory',
    embeddingModel: 'text-embedding-3-small',
    maxRetrievedDocs: 5,
    similarityThreshold: 0.7,
    autoIndex: true,
    categories: [],
  },
};

export function MemoryCluster({
  value: externalValue,
  onChange,
  isExpanded: controlledExpanded = true,
  onToggle,
  disabled = false,
  className,
}: MemoryClusterProps) {
  const [localExpanded, setLocalExpanded] = React.useState(true);
  const isExpanded = onToggle ? controlledExpanded : localExpanded;
  const handleToggle = onToggle || (() => setLocalExpanded(!localExpanded));

  // Use external value or default
  const value = externalValue || DEFAULT_MEMORY_VALUE;

  const updateWorking = (updates: Partial<WorkingMemoryConfig>) => {
    onChange({ ...value, working: { ...value.working, ...updates } });
  };

  const updateSession = (updates: Partial<SessionMemoryConfig>) => {
    onChange({ ...value, session: { ...value.session, ...updates } });
  };

  const updateLongTerm = (updates: Partial<LongTermMemoryConfig>) => {
    onChange({ ...value, longTerm: { ...value.longTerm, ...updates } });
  };

  return (
    <div className={cn('border border-slate-200 dark:border-dark-border-primary rounded-lg overflow-hidden', className)}>
      {/* Cluster Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-dark-bg-tertiary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
            <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
              Memory Configuration
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
              Working, session, and long-term memory ({value.longTerm?.enabled ? 'Long-term enabled' : 'Session only'})
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-slate-400 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Cluster Content */}
      {isExpanded && (
        <div className="px-4 py-4 bg-white dark:bg-dark-bg-secondary space-y-4">
        {/* Working Memory */}
        <MemorySection
          title="Working Memory"
          description="Short-term context window management"
          icon={<Cpu className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          iconBg="bg-amber-100 dark:bg-amber-500/20"
          enabled={value.working.enabled}
          onToggle={(enabled) => updateWorking({ enabled })}
          disabled={disabled}
        >
          <SliderField
            label="Max Tokens"
            value={value.working.maxTokens}
            onChange={(maxTokens) => updateWorking({ maxTokens })}
            min={1000}
            max={128000}
            step={1000}
            valueFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            marks={[
              { value: 4000, label: '4K' },
              { value: 32000, label: '32K' },
              { value: 64000, label: '64K' },
              { value: 128000, label: '128K' },
            ]}
            disabled={disabled}
          />

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary">
            <div>
              <div className="font-medium text-sm text-slate-700 dark:text-dark-text-secondary">
                Enable Compression
              </div>
              <div className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                Compress older context to fit more information
              </div>
            </div>
            <input
              type="checkbox"
              checked={value.working.compressionEnabled}
              onChange={(e) => updateWorking({ compressionEnabled: e.target.checked })}
              disabled={disabled}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
          </div>

          {value.working.compressionEnabled && (
            <SliderField
              label="Compression Threshold"
              value={value.working.compressionThreshold}
              onChange={(compressionThreshold) => updateWorking({ compressionThreshold })}
              min={50}
              max={95}
              step={5}
              valueFormatter={(v) => `${v}%`}
              hint="Start compressing when context reaches this percentage"
              disabled={disabled}
            />
          )}
        </MemorySection>

        {/* Session Memory */}
        <MemorySection
          title="Session Memory"
          description="Conversation history within a session"
          icon={<Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-100 dark:bg-blue-500/20"
          enabled={value.session.enabled}
          onToggle={(enabled) => updateSession({ enabled })}
          disabled={disabled}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                TTL (minutes)
              </label>
              <input
                type="number"
                value={value.session.ttlMinutes}
                onChange={(e) => updateSession({ ttlMinutes: parseInt(e.target.value) || 60 })}
                min={5}
                max={1440}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Max Entries
              </label>
              <input
                type="number"
                value={value.session.maxEntries}
                onChange={(e) => updateSession({ maxEntries: parseInt(e.target.value) || 100 })}
                min={10}
                max={1000}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value.session.persistOnClose}
                onChange={(e) => updateSession({ persistOnClose: e.target.checked })}
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                Persist session on close
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value.session.includeSystemMessages}
                onChange={(e) => updateSession({ includeSystemMessages: e.target.checked })}
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                Include system messages in history
              </span>
            </label>
          </div>
        </MemorySection>

        {/* Long-Term Memory */}
        <MemorySection
          title="Long-Term Memory"
          description="Vector-based persistent memory storage"
          icon={<Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-100 dark:bg-emerald-500/20"
          enabled={value.longTerm.enabled}
          onToggle={(enabled) => updateLongTerm({ enabled })}
          disabled={disabled}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Provider
              </label>
              <select
                value={value.longTerm.provider}
                onChange={(e) => updateLongTerm({ provider: e.target.value as any })}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              >
                {MEMORY_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Index Name
              </label>
              <input
                type="text"
                value={value.longTerm.indexName}
                onChange={(e) => updateLongTerm({ indexName: e.target.value })}
                placeholder="agent-memory"
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
              Embedding Model
            </label>
            <select
              value={value.longTerm.embeddingModel}
              onChange={(e) => updateLongTerm({ embeddingModel: e.target.value })}
              disabled={disabled}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
            >
              {EMBEDDING_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SliderField
              label="Max Retrieved Docs"
              value={value.longTerm.maxRetrievedDocs}
              onChange={(maxRetrievedDocs) => updateLongTerm({ maxRetrievedDocs })}
              min={1}
              max={20}
              step={1}
              disabled={disabled}
            />
            <SliderField
              label="Similarity Threshold"
              value={value.longTerm.similarityThreshold}
              onChange={(similarityThreshold) => updateLongTerm({ similarityThreshold })}
              min={0}
              max={1}
              step={0.05}
              valueFormatter={(v) => v.toFixed(2)}
              disabled={disabled}
            />
          </div>

          <MultiSelect
            label="Memory Categories"
            options={MEMORY_CATEGORIES}
            value={value.longTerm.categories}
            onChange={(categories) => updateLongTerm({ categories })}
            disabled={disabled}
            placeholder="Select categories to index..."
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value.longTerm.autoIndex}
              onChange={(e) => updateLongTerm({ autoIndex: e.target.checked })}
              disabled={disabled}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
              Auto-index new memories
            </span>
          </label>
        </MemorySection>
        </div>
      )}
    </div>
  );
}

export default MemoryCluster;
