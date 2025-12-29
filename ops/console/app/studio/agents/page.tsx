/**
 * AgentOS Studio - Agents Page
 * Agent list and management interface with table/grid views
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AgentManager } from '@/components/AgentManager/AgentManager';
import { Button } from '@/components/ui/Button';
import type { AgentPack } from '@/types';
import { Plus, Download, Upload, Settings } from 'lucide-react';

// ============================================
// Types
// ============================================

export type AuthorityLevel = 'operator' | 'manager' | 'worker' | 'observer';

export interface StudioAgent {
  id: string;
  name: string;
  role: string;
  pack: AgentPack;
  authority: AuthorityLevel;
  status: 'active' | 'inactive';
  lastModified: string;
  version: string;
  description: string;
  capabilities: string[];
  createdAt: string;
  executionCount: number;
}

// ============================================
// Mock Data Generator
// ============================================

const PACK_LIST: AgentPack[] = [
  'devops', 'qa', 'legal', 'mobile', 'research', 'planning',
  'analytics', 'orchestration', 'error_predictor', 'product',
  'marketing', 'supabase', 'design', 'engineering'
];

const AUTHORITY_LEVELS: AuthorityLevel[] = ['operator', 'manager', 'worker', 'observer'];

const AGENT_ROLES: Record<AgentPack, string[]> = {
  devops: ['CI/CD Manager', 'Infrastructure Monitor', 'Deployment Coordinator', 'Log Analyzer', 'Security Scanner', 'Container Orchestrator', 'Config Manager'],
  qa: ['Test Runner', 'Bug Detector', 'Regression Analyzer', 'Performance Tester', 'API Validator', 'E2E Test Manager'],
  legal: ['Contract Reviewer', 'Compliance Checker', 'Policy Enforcer', 'Privacy Auditor', 'License Scanner', 'Terms Analyzer'],
  mobile: ['iOS Builder', 'Android Compiler', 'Cross-Platform Sync', 'App Store Manager', 'Push Notification Handler', 'Deep Link Resolver'],
  research: ['Data Miner', 'Trend Analyzer', 'Competitive Intel', 'Market Researcher', 'Patent Scanner', 'Academic Crawler'],
  planning: ['Sprint Planner', 'Resource Allocator', 'Timeline Manager', 'Dependency Tracker', 'Risk Assessor', 'Milestone Monitor'],
  analytics: ['Metrics Collector', 'Dashboard Generator', 'Report Builder', 'Anomaly Detector', 'Funnel Analyzer', 'Cohort Tracker'],
  orchestration: ['Workflow Manager', 'Task Dispatcher', 'Agent Coordinator', 'Pipeline Controller', 'Event Router', 'State Manager'],
  error_predictor: ['Failure Forecaster', 'Pattern Recognizer', 'Alert Prioritizer', 'Root Cause Analyzer', 'Incident Classifier', 'Remediation Suggester'],
  product: ['Feature Prioritizer', 'Roadmap Curator', 'Feedback Analyzer', 'User Story Generator', 'Backlog Manager', 'Release Coordinator'],
  marketing: ['Content Optimizer', 'Campaign Manager', 'SEO Analyzer', 'Social Media Monitor', 'Email Automator', 'Lead Scorer'],
  supabase: ['Schema Manager', 'Query Optimizer', 'Auth Handler', 'Storage Coordinator', 'Realtime Monitor', 'Edge Function Deployer'],
  design: ['UI Validator', 'Accessibility Checker', 'Design Token Manager', 'Component Library', 'Style Guide Enforcer', 'Asset Optimizer'],
  engineering: ['Code Reviewer', 'Refactoring Assistant', 'Documentation Generator', 'Tech Debt Tracker', 'Architecture Advisor', 'Dependency Updater']
};

const CAPABILITIES = [
  'Read Files', 'Write Files', 'Execute Commands', 'API Access',
  'Database Access', 'External Services', 'User Communication',
  'Approval Requests', 'Resource Allocation', 'Configuration Changes'
];

function generateMockAgents(count: number): StudioAgent[] {
  const agents: StudioAgent[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    const pack = PACK_LIST[i % PACK_LIST.length];
    const roles = AGENT_ROLES[pack];
    const role = roles[Math.floor(Math.random() * roles.length)];

    let baseName = `${role.replace(/\s+/g, '')}-${pack}`;
    let name = baseName;
    let suffix = 1;
    while (usedNames.has(name)) {
      name = `${baseName}-${suffix++}`;
    }
    usedNames.add(name);

    const daysAgo = Math.floor(Math.random() * 90);
    const createdDaysAgo = daysAgo + Math.floor(Math.random() * 180);

    agents.push({
      id: `agent-${i + 1}-${Date.now()}`,
      name,
      role,
      pack,
      authority: AUTHORITY_LEVELS[Math.floor(Math.random() * AUTHORITY_LEVELS.length)],
      status: Math.random() > 0.2 ? 'active' : 'inactive',
      lastModified: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      version: `${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 20)}`,
      description: `${role} agent for the ${pack} pack. Handles automated ${pack} tasks and workflows.`,
      capabilities: CAPABILITIES.slice(0, Math.floor(Math.random() * 5) + 3),
      createdAt: new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
      executionCount: Math.floor(Math.random() * 10000)
    });
  }

  return agents;
}

// Generate 98 agents across 16 packs (extra 2 packs will be covered by modulo)
const MOCK_AGENTS = generateMockAgents(98);

// ============================================
// Page Component
// ============================================

export default function StudioAgentsPage() {
  const router = useRouter();
  const [agents] = useState<StudioAgent[]>(MOCK_AGENTS);

  const packStats = useMemo(() => {
    const stats: Record<string, number> = {};
    agents.forEach(agent => {
      stats[agent.pack] = (stats[agent.pack] || 0) + 1;
    });
    return stats;
  }, [agents]);

  const statusStats = useMemo(() => ({
    active: agents.filter(a => a.status === 'active').length,
    inactive: agents.filter(a => a.status === 'inactive').length
  }), [agents]);

  const handleBulkAction = useCallback((action: string, selectedIds: string[]) => {
    console.log(`Bulk action: ${action}`, selectedIds);
    // In production, this would trigger API calls
  }, []);

  const handleAgentAction = useCallback((action: string, agentId: string) => {
    console.log(`Agent action: ${action}`, agentId);

    // Handle delete action with confirmation
    if (action === 'delete') {
      if (confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
        console.log('Deleting agent:', agentId);
        // In production: API call to delete
      }
      return;
    }

    // Handle enable/disable actions
    if (action === 'enable' || action === 'disable') {
      console.log(`${action === 'enable' ? 'Enabling' : 'Disabling'} agent:`, agentId);
      // In production: API call to update status
      return;
    }

    // Handle duplicate action
    if (action === 'duplicate') {
      console.log('Duplicating agent:', agentId);
      router.push(`/studio/agents/new?duplicate=${agentId}`);
      return;
    }

    // Handle export actions
    if (action === 'export-json') {
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        const blob = new Blob([JSON.stringify(agent, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${agent.name}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      return;
    }

    // Handle run action
    if (action === 'run') {
      console.log('Running agent:', agentId);
      // In production: API call to trigger agent execution
      return;
    }

    // Handle configure action
    if (action === 'configure') {
      router.push(`/studio/agents/${agentId}?tab=settings`);
      return;
    }
  }, [agents, router]);

  const handleExportAll = useCallback(() => {
    const blob = new Blob([JSON.stringify(agents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agents-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [agents]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg-primary">
      <div className="max-w-[1800px] mx-auto p-6">
        {/* Page Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-dark-text-primary">
              Agent Manager
            </h1>
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mt-1">
              Manage {agents.length} agents across {Object.keys(packStats).length} packs
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportAll}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Import
            </Button>
            <Link href="/studio/agents/new">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                New Agent
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">Total Agents</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-dark-text-primary">{agents.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">Active</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{statusStats.active}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">Inactive</p>
            <p className="text-2xl font-bold text-slate-400">{statusStats.inactive}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">Packs</p>
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{Object.keys(packStats).length}</p>
          </div>
        </div>

        {/* Agent Manager Component */}
        <AgentManager
          agents={agents}
          onBulkAction={handleBulkAction}
          onAgentAction={handleAgentAction}
        />
      </div>
    </div>
  );
}
