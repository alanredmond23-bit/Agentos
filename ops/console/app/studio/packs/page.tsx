/**
 * AgentOS Ops Console - Pack Browser Page
 * Browse, search, and filter available agent packs
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PackBrowser } from '@/components/PackBrowser/PackBrowser';
import { PageLoading } from '@/components/ui/Spinner';

// ============================================
// Metadata Configuration
// ============================================

export const metadata: Metadata = {
  title: 'Pack Browser',
  description: 'Browse and discover agent packs for your organization',
};

// ============================================
// Pack Types
// ============================================

export type PackCategory = 'production' | 'beta' | 'alpha';
export type PackLifecycle = 'stable' | 'maintenance' | 'deprecated' | 'experimental';
export type PackDomain =
  | 'engineering'
  | 'operations'
  | 'analytics'
  | 'business'
  | 'security'
  | 'infrastructure';

export interface PackAgent {
  id: string;
  name: string;
  description: string;
}

export interface Pack {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  longDescription?: string;
  category: PackCategory;
  lifecycle: PackLifecycle;
  domain: PackDomain;
  agents: PackAgent[];
  agentCount: number;
  popularity: number;
  downloads: number;
  author: string;
  repository?: string;
  documentation?: string;
  icon?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastPublished: string;
}

// ============================================
// Mock Pack Data
// ============================================

export const mockPacks: Pack[] = [
  {
    id: '1',
    name: 'Product',
    slug: 'product',
    version: '2.1.0',
    description: 'Product management, roadmap planning, and feature prioritization agents',
    longDescription: 'A comprehensive pack for product managers including backlog grooming, feature scoring, and stakeholder communication automation.',
    category: 'production',
    lifecycle: 'stable',
    domain: 'business',
    agents: [{ id: 'pm-1', name: 'Roadmap Planner', description: 'Plans product roadmaps' }],
    agentCount: 4,
    popularity: 95,
    downloads: 12500,
    author: 'AgentOS Core',
    tags: ['product', 'planning', 'roadmap'],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-12-20T08:00:00Z',
    lastPublished: '2024-12-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Marketing',
    slug: 'marketing',
    version: '1.8.0',
    description: 'Marketing automation, content generation, and campaign analytics agents',
    category: 'production',
    lifecycle: 'stable',
    domain: 'business',
    agents: [],
    agentCount: 6,
    popularity: 88,
    downloads: 9800,
    author: 'AgentOS Core',
    tags: ['marketing', 'content', 'analytics'],
    createdAt: '2024-02-10T10:00:00Z',
    updatedAt: '2024-12-18T08:00:00Z',
    lastPublished: '2024-12-10T10:00:00Z',
  },
  {
    id: '3',
    name: 'Supabase',
    slug: 'supabase',
    version: '1.5.2',
    description: 'Supabase database management, migration, and real-time sync agents',
    category: 'production',
    lifecycle: 'stable',
    domain: 'infrastructure',
    agents: [],
    agentCount: 3,
    popularity: 82,
    downloads: 7600,
    author: 'Community',
    tags: ['database', 'supabase', 'backend'],
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-12-22T08:00:00Z',
    lastPublished: '2024-12-22T10:00:00Z',
  },
  {
    id: '4',
    name: 'Engineering',
    slug: 'engineering',
    version: '3.0.0',
    description: 'Code review, refactoring, documentation, and technical debt management',
    category: 'production',
    lifecycle: 'stable',
    domain: 'engineering',
    agents: [],
    agentCount: 8,
    popularity: 97,
    downloads: 18500,
    author: 'AgentOS Core',
    tags: ['code', 'review', 'documentation'],
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-12-25T08:00:00Z',
    lastPublished: '2024-12-25T10:00:00Z',
  },
  {
    id: '5',
    name: 'Design',
    slug: 'design',
    version: '1.2.0',
    description: 'Design system management, asset generation, and accessibility auditing',
    category: 'beta',
    lifecycle: 'experimental',
    domain: 'engineering',
    agents: [],
    agentCount: 3,
    popularity: 72,
    downloads: 3200,
    author: 'AgentOS Core',
    tags: ['design', 'ui', 'accessibility'],
    createdAt: '2024-06-15T10:00:00Z',
    updatedAt: '2024-12-20T08:00:00Z',
    lastPublished: '2024-12-18T10:00:00Z',
  },
  {
    id: '6',
    name: 'DevOps',
    slug: 'devops',
    version: '2.5.1',
    description: 'CI/CD automation, infrastructure as code, and deployment orchestration',
    category: 'production',
    lifecycle: 'stable',
    domain: 'operations',
    agents: [],
    agentCount: 7,
    popularity: 94,
    downloads: 15200,
    author: 'AgentOS Core',
    tags: ['devops', 'ci-cd', 'infrastructure'],
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-12-26T08:00:00Z',
    lastPublished: '2024-12-24T10:00:00Z',
  },
  {
    id: '7',
    name: 'QA',
    slug: 'qa',
    version: '2.0.3',
    description: 'Test automation, quality assurance, and regression testing agents',
    category: 'production',
    lifecycle: 'stable',
    domain: 'engineering',
    agents: [],
    agentCount: 5,
    popularity: 89,
    downloads: 11000,
    author: 'AgentOS Core',
    tags: ['testing', 'qa', 'automation'],
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-12-23T08:00:00Z',
    lastPublished: '2024-12-20T10:00:00Z',
  },
  {
    id: '8',
    name: 'Legal',
    slug: 'legal',
    version: '1.1.0',
    description: 'Contract analysis, compliance checking, and legal document automation',
    category: 'production',
    lifecycle: 'stable',
    domain: 'business',
    agents: [],
    agentCount: 3,
    popularity: 76,
    downloads: 4500,
    author: 'AgentOS Core',
    tags: ['legal', 'compliance', 'contracts'],
    createdAt: '2024-04-10T10:00:00Z',
    updatedAt: '2024-12-15T08:00:00Z',
    lastPublished: '2024-12-12T10:00:00Z',
  },
  {
    id: '9',
    name: 'Mobile',
    slug: 'mobile',
    version: '1.6.0',
    description: 'Mobile app testing, cross-platform development, and app store optimization',
    category: 'beta',
    lifecycle: 'stable',
    domain: 'engineering',
    agents: [],
    agentCount: 4,
    popularity: 78,
    downloads: 5800,
    author: 'Community',
    tags: ['mobile', 'ios', 'android'],
    createdAt: '2024-05-01T10:00:00Z',
    updatedAt: '2024-12-21T08:00:00Z',
    lastPublished: '2024-12-19T10:00:00Z',
  },
  {
    id: '10',
    name: 'Research',
    slug: 'research',
    version: '1.4.0',
    description: 'Market research, competitive analysis, and trend identification agents',
    category: 'production',
    lifecycle: 'stable',
    domain: 'analytics',
    agents: [],
    agentCount: 4,
    popularity: 84,
    downloads: 7200,
    author: 'AgentOS Core',
    tags: ['research', 'analysis', 'insights'],
    createdAt: '2024-03-15T10:00:00Z',
    updatedAt: '2024-12-22T08:00:00Z',
    lastPublished: '2024-12-20T10:00:00Z',
  },
  {
    id: '11',
    name: 'Planning',
    slug: 'planning',
    version: '1.3.0',
    description: 'Sprint planning, resource allocation, and project timeline management',
    category: 'production',
    lifecycle: 'stable',
    domain: 'operations',
    agents: [],
    agentCount: 3,
    popularity: 81,
    downloads: 6400,
    author: 'AgentOS Core',
    tags: ['planning', 'agile', 'project'],
    createdAt: '2024-04-01T10:00:00Z',
    updatedAt: '2024-12-19T08:00:00Z',
    lastPublished: '2024-12-17T10:00:00Z',
  },
  {
    id: '12',
    name: 'Analytics',
    slug: 'analytics',
    version: '2.2.0',
    description: 'Data analytics, reporting automation, and business intelligence agents',
    category: 'production',
    lifecycle: 'stable',
    domain: 'analytics',
    agents: [],
    agentCount: 5,
    popularity: 91,
    downloads: 13500,
    author: 'AgentOS Core',
    tags: ['analytics', 'reporting', 'bi'],
    createdAt: '2024-02-15T10:00:00Z',
    updatedAt: '2024-12-24T08:00:00Z',
    lastPublished: '2024-12-23T10:00:00Z',
  },
  {
    id: '13',
    name: 'Orchestration',
    slug: 'orchestration',
    version: '1.0.0',
    description: 'Multi-agent coordination, workflow automation, and task distribution',
    category: 'alpha',
    lifecycle: 'experimental',
    domain: 'operations',
    agents: [],
    agentCount: 2,
    popularity: 65,
    downloads: 1800,
    author: 'AgentOS Labs',
    tags: ['orchestration', 'workflow', 'multi-agent'],
    createdAt: '2024-09-01T10:00:00Z',
    updatedAt: '2024-12-26T08:00:00Z',
    lastPublished: '2024-12-25T10:00:00Z',
  },
  {
    id: '14',
    name: 'Error Predictor',
    slug: 'error_predictor',
    version: '0.9.1',
    description: 'ML-powered error prediction, anomaly detection, and proactive alerting',
    category: 'alpha',
    lifecycle: 'experimental',
    domain: 'operations',
    agents: [],
    agentCount: 2,
    popularity: 58,
    downloads: 1200,
    author: 'AgentOS Labs',
    tags: ['ml', 'prediction', 'monitoring'],
    createdAt: '2024-08-15T10:00:00Z',
    updatedAt: '2024-12-27T08:00:00Z',
    lastPublished: '2024-12-26T10:00:00Z',
  },
  {
    id: '15',
    name: 'Finance',
    slug: 'finance',
    version: '1.7.0',
    description: 'Financial reporting, expense tracking, and budget automation agents',
    category: 'production',
    lifecycle: 'stable',
    domain: 'business',
    agents: [],
    agentCount: 4,
    popularity: 86,
    downloads: 8900,
    author: 'AgentOS Core',
    tags: ['finance', 'accounting', 'budget'],
    createdAt: '2024-03-20T10:00:00Z',
    updatedAt: '2024-12-21T08:00:00Z',
    lastPublished: '2024-12-18T10:00:00Z',
  },
  {
    id: '16',
    name: 'Lead Faucet',
    slug: 'lead_faucet',
    version: '1.0.0-beta',
    description: 'Lead generation, prospect enrichment, and sales pipeline automation',
    category: 'beta',
    lifecycle: 'experimental',
    domain: 'business',
    agents: [],
    agentCount: 3,
    popularity: 70,
    downloads: 2400,
    author: 'Community',
    tags: ['sales', 'leads', 'crm'],
    createdAt: '2024-07-10T10:00:00Z',
    updatedAt: '2024-12-23T08:00:00Z',
    lastPublished: '2024-12-21T10:00:00Z',
  },
];

// ============================================
// Pack Browser Page Component
// ============================================

export default function PackBrowserPage() {
  return (
    <Suspense fallback={<PageLoading text="Loading packs..." />}>
      <PackBrowser packs={mockPacks} />
    </Suspense>
  );
}
