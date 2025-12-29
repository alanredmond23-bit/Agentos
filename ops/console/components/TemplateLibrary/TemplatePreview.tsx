/**
 * AgentOS Studio - Template Preview Component
 * Modal showing full template details with YAML preview
 */

'use client';

import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { AgentTemplate } from '@/lib/studio/templates';
import {
  AUTHORITY_LEVELS,
  ZONE_INFO,
} from '@/lib/studio/templates';
import {
  X,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  Shield,
  MapPin,
  Wrench,
  Star,
  Code2,
  Settings,
  Lock,
  FileText,
  Cpu,
  Thermometer,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface TemplatePreviewProps {
  template: AgentTemplate;
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (template: AgentTemplate) => void;
}

type TabId = 'overview' | 'yaml' | 'tools';

// ============================================
// YAML Generator
// ============================================

function generateTemplateYaml(template: AgentTemplate): string {
  const yaml = `# AgentOS Agent Configuration
# Template: ${template.name}
# Generated: ${new Date().toISOString()}

agent:
  name: "${template.name}"
  slug: "${template.id}"
  description: |
    ${template.description}

  pack: ${template.pack}
  category: ${template.category}

authority:
  level: ${template.authorityLevel}
  zones:
${template.zones.map((z) => `    - ${z}`).join('\n')}

capabilities:
${template.capabilities
  .map(
    (cap) => `  - id: ${cap.id}
    name: "${cap.name}"
    description: "${cap.description}"
    enabled: ${cap.enabled}
    tools:
${cap.tools.map((t) => `      - ${t}`).join('\n')}`
  )
  .join('\n')}

tools:
${template.tools.map((t) => `  - ${t.id}`).join('\n')}

configuration:
  model: ${template.defaultConfiguration.model}
  temperature: ${template.defaultConfiguration.temperature}
  max_tokens: ${template.defaultConfiguration.maxTokens}
  auto_approve_threshold: ${template.defaultConfiguration.autoApproveThreshold}
  rate_limits:
    per_minute: ${template.defaultConfiguration.rateLimitPerMinute}
    per_hour: ${template.defaultConfiguration.rateLimitPerHour}
  retry_policy:
    max_attempts: ${template.defaultConfiguration.retryMaxAttempts}
    initial_delay_ms: ${template.defaultConfiguration.retryInitialDelayMs}

metadata:
  tags:
${template.tags.map((t) => `    - ${t}`).join('\n')}
  is_official: ${template.isOfficial}
  popularity: ${template.popularity}
  created_at: ${template.createdAt}
  updated_at: ${template.updatedAt}
`;
  return yaml;
}

// ============================================
// Template Preview Component
// ============================================

export function TemplatePreview({
  template,
  isOpen,
  onClose,
  onUseTemplate,
}: TemplatePreviewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [copied, setCopied] = useState(false);

  // ============================================
  // Handlers
  // ============================================

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleUseTemplate = useCallback(() => {
    onUseTemplate(template);
    onClose();
  }, [template, onUseTemplate, onClose]);

  const handleCopyYaml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generateTemplateYaml(template));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy YAML:', error);
    }
  }, [template]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // ============================================
  // Render
  // ============================================

  if (!isOpen) return null;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { id: 'yaml', label: 'YAML', icon: <Code2 className="w-4 h-4" /> },
    { id: 'tools', label: 'Tools', icon: <Wrench className="w-4 h-4" /> },
  ];

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-preview-title"
    >
      <div className="w-full max-w-3xl max-h-[85vh] bg-white dark:bg-dark-bg-secondary rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${template.color}20`, color: template.color }}
            >
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="template-preview-title"
                  className="text-xl font-semibold text-slate-900 dark:text-dark-text-primary"
                >
                  {template.name}
                </h2>
                {template.isOfficial && (
                  <Badge variant="info" size="sm">
                    Official
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mt-1">
                {template.shortDescription}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="primary" size="sm">
                  {template.pack}
                </Badge>
                <Badge variant="default" size="sm">
                  {template.category}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-dark-text-tertiary">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  {template.popularity}% popularity
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary text-slate-400 hover:text-slate-600 dark:hover:text-dark-text-secondary transition-colors"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-slate-200 dark:border-dark-border-primary">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors -mb-px',
                activeTab === tab.id
                  ? 'text-brand-600 dark:text-brand-400 border-brand-600 dark:border-brand-400 bg-brand-50 dark:bg-brand-900/20'
                  : 'text-slate-500 dark:text-dark-text-tertiary border-transparent hover:text-slate-700 dark:hover:text-dark-text-secondary'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary mb-2">
                  Description
                </h3>
                <p className="text-sm text-slate-600 dark:text-dark-text-secondary">
                  {template.description}
                </p>
              </div>

              {/* Authority & Zones */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-slate-500" />
                    <h4 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                      Authority Level
                    </h4>
                  </div>
                  <p className="text-sm font-medium text-brand-600 dark:text-brand-400">
                    {AUTHORITY_LEVELS[template.authorityLevel].label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-1">
                    {AUTHORITY_LEVELS[template.authorityLevel].description}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <h4 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                      Zone Access
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {template.zones.map((zone) => {
                      const info = ZONE_INFO[zone];
                      return (
                        <span
                          key={zone}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                            info.bgColor,
                            info.color
                          )}
                        >
                          {info.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary mb-3">
                  Capabilities
                </h3>
                <div className="space-y-2">
                  {template.capabilities.map((cap) => (
                    <div
                      key={cap.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-dark-border-primary"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                            {cap.name}
                          </span>
                        </div>
                        <Badge
                          variant={cap.enabled ? 'success' : 'default'}
                          size="sm"
                        >
                          {cap.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-1 ml-6">
                        {cap.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuration Summary */}
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary mb-3">
                  Default Configuration
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary">
                    <Cpu className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">Model</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                        {template.defaultConfiguration.model.split('-').slice(0, 2).join(' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary">
                    <Thermometer className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">Temperature</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                        {template.defaultConfiguration.temperature}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary mb-2">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="default" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* YAML Tab */}
          {activeTab === 'yaml' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                  YAML configuration for this template
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyYaml}
                  leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                >
                  {copied ? 'Copied!' : 'Copy YAML'}
                </Button>
              </div>
              <div className="relative rounded-lg bg-slate-900 dark:bg-dark-bg-primary overflow-hidden">
                <pre className="p-4 overflow-x-auto text-sm text-slate-300 font-mono leading-relaxed">
                  {generateTemplateYaml(template)}
                </pre>
              </div>
            </div>
          )}

          {/* Tools Tab */}
          {activeTab === 'tools' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                Tools and capabilities available in this template
              </p>
              <div className="grid grid-cols-2 gap-3">
                {template.tools.map((tool) => {
                  const riskColors: Record<string, string> = {
                    low: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
                    medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
                    high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
                    critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                  };
                  return (
                    <div
                      key={tool.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-dark-border-primary"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                            {tool.name}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-2xs font-medium capitalize',
                            riskColors[tool.riskLevel]
                          )}
                        >
                          {tool.riskLevel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-1">
                        {tool.description}
                      </p>
                      {tool.requiresApproval && (
                        <div className="flex items-center gap-1 mt-2 text-2xs text-amber-600 dark:text-amber-400">
                          <Lock className="w-3 h-3" />
                          Requires approval
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-dark-border-primary">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleUseTemplate}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Use This Template
          </Button>
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body level
  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
}

export default TemplatePreview;
