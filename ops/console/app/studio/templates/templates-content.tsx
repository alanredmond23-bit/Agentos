/**
 * AgentOS Studio - Templates Page Content
 * Client-side content for the templates page
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TemplateLibrary } from '@/components/TemplateLibrary/TemplateLibrary';
import type { AgentTemplate } from '@/lib/studio/templates';
import {
  Plus,
  Sparkles,
  ArrowRight,
  Download,
  Share2,
  BookOpen,
  Lightbulb,
  Zap,
} from 'lucide-react';

// ============================================
// Templates Page Content Component
// ============================================

export function TemplatesPageContent() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);

  // ============================================
  // Handlers
  // ============================================

  const handleCreateNew = useCallback(() => {
    router.push('/studio/agents/new');
  }, [router]);

  const handleUseTemplate = useCallback(
    (template: AgentTemplate) => {
      router.push(`/studio/agents/new?template=${template.id}`);
    },
    [router]
  );

  const handleTemplateSelect = useCallback((template: AgentTemplate) => {
    setSelectedTemplate(template);
  }, []);

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-dark-text-primary">
            Agent Templates
          </h1>
          <p className="text-sm text-slate-600 dark:text-dark-text-secondary mt-1">
            Pre-built templates to quickly create specialized agents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateNew}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Agent
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Start from Scratch */}
        <Card
          interactive
          className="cursor-pointer group"
          onClick={handleCreateNew}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white">
                <Zap className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-dark-text-primary group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  Start from Scratch
                </h3>
                <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mt-1">
                  Create a fully custom agent with the wizard
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
            </div>
          </CardContent>
        </Card>

        {/* Use a Template */}
        <Card className="border-dashed">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-dark-text-primary">
                  Use a Template
                </h3>
                <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mt-1">
                  Start with pre-configured settings and tools
                </p>
                <Badge variant="info" size="sm" className="mt-2">
                  8 templates available
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clone Existing */}
        <Card className="border-dashed">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Share2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-dark-text-primary">
                  Clone Existing Agent
                </h3>
                <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mt-1">
                  Duplicate an existing agent as a starting point
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips Section */}
      <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <div className="flex gap-3">
          <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-300">
              Pro Tip: Templates are customizable
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              You can modify any template after selection. Use templates as a starting point
              and adjust the configuration to match your specific needs.
            </p>
          </div>
        </div>
      </div>

      {/* Template Library */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-dark-text-primary">
            Template Library
          </h2>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<BookOpen className="w-4 h-4" />}
          >
            View Documentation
          </Button>
        </div>
        <TemplateLibrary
          showImportOptions={true}
          onSelectTemplate={handleUseTemplate}
        />
      </div>

      {/* Create Custom Template CTA */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-dark-bg-tertiary dark:to-dark-bg-secondary">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-dark-text-primary">
                Create Your Own Template
              </h3>
              <p className="text-sm text-slate-600 dark:text-dark-text-secondary mt-1">
                Save any agent configuration as a reusable template for your team
              </p>
            </div>
            <Button variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Learn More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TemplatesPageContent;
