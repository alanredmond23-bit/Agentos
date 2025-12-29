/**
 * AgentOS Agent Studio - Dashboard Page
 * Main studio dashboard with pack overview and quick actions
 * Entry point for the Agent Studio experience
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { StudioDashboard } from '@/components/studio/StudioDashboard';
import { PageLoading } from '@/components/ui/Spinner';

// ============================================
// Metadata Configuration
// ============================================

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Agent Studio dashboard - manage your AI agent packs and configurations',
  openGraph: {
    title: 'Agent Studio Dashboard',
    description: 'Build, configure, and deploy AI agent packs with visual tools',
  },
};

// ============================================
// Studio Dashboard Page Types
// ============================================

export interface StudioStats {
  totalPacks: number;
  totalAgents: number;
  activePacks: number;
  draftPacks: number;
  recentChanges: number;
  templatesAvailable: number;
}

export interface RecentActivity {
  id: string;
  type: 'created' | 'updated' | 'deployed' | 'archived';
  packName: string;
  agentName?: string;
  timestamp: string;
  user: string;
  avatarUrl?: string;
}

export interface PackSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  agentCount: number;
  status: 'active' | 'draft' | 'archived';
  lastUpdated: string;
  icon: string;
  version?: string;
  author?: string;
}

// ============================================
// Mock Data - Stats
// ============================================

const mockStats: StudioStats = {
  totalPacks: 16,
  totalAgents: 98,
  activePacks: 14,
  draftPacks: 2,
  recentChanges: 23,
  templatesAvailable: 12,
};

// ============================================
// Mock Data - Recent Activity
// ============================================

const mockRecentActivity: RecentActivity[] = [
  {
    id: '1',
    type: 'deployed',
    packName: 'devops',
    timestamp: '2024-12-28T09:15:00Z',
    user: 'Sarah Chen',
  },
  {
    id: '2',
    type: 'updated',
    packName: 'devops',
    agentName: 'CI/CD Pipeline Manager',
    timestamp: '2024-12-28T09:10:00Z',
    user: 'Sarah Chen',
  },
  {
    id: '3',
    type: 'created',
    packName: 'analytics',
    agentName: 'Data Insights Agent',
    timestamp: '2024-12-28T08:45:00Z',
    user: 'Mike Johnson',
  },
  {
    id: '4',
    type: 'deployed',
    packName: 'research',
    timestamp: '2024-12-28T08:30:00Z',
    user: 'Emily Davis',
  },
  {
    id: '5',
    type: 'updated',
    packName: 'qa',
    agentName: 'Test Suite Runner',
    timestamp: '2024-12-27T16:20:00Z',
    user: 'Alex Kim',
  },
  {
    id: '6',
    type: 'created',
    packName: 'mobile',
    agentName: 'App Store Optimizer',
    timestamp: '2024-12-27T14:00:00Z',
    user: 'Sarah Chen',
  },
  {
    id: '7',
    type: 'archived',
    packName: 'legacy-tools',
    timestamp: '2024-12-27T11:30:00Z',
    user: 'Mike Johnson',
  },
];

// ============================================
// Mock Data - Packs
// ============================================

const mockPacks: PackSummary[] = [
  {
    id: '1',
    name: 'DevOps',
    slug: 'devops',
    description: 'CI/CD, infrastructure, and deployment automation agents',
    agentCount: 8,
    status: 'active',
    lastUpdated: '2024-12-28T09:15:00Z',
    icon: 'terminal',
    version: '2.1.0',
    author: 'Platform Team',
  },
  {
    id: '2',
    name: 'QA & Testing',
    slug: 'qa',
    description: 'Automated testing, quality assurance, and validation agents',
    agentCount: 6,
    status: 'active',
    lastUpdated: '2024-12-27T16:20:00Z',
    icon: 'check-circle',
    version: '1.8.0',
    author: 'QA Team',
  },
  {
    id: '3',
    name: 'Research',
    slug: 'research',
    description: 'Market research, competitive analysis, and insights gathering',
    agentCount: 5,
    status: 'active',
    lastUpdated: '2024-12-28T08:30:00Z',
    icon: 'search',
    version: '1.5.0',
    author: 'Research Team',
  },
  {
    id: '4',
    name: 'Analytics',
    slug: 'analytics',
    description: 'Data processing, visualization, and automated reporting',
    agentCount: 7,
    status: 'active',
    lastUpdated: '2024-12-28T08:45:00Z',
    icon: 'bar-chart',
    version: '2.0.0',
    author: 'Data Team',
  },
  {
    id: '5',
    name: 'Legal',
    slug: 'legal',
    description: 'Contract review, compliance checking, and legal research',
    agentCount: 4,
    status: 'active',
    lastUpdated: '2024-12-26T11:30:00Z',
    icon: 'scale',
    version: '1.2.0',
    author: 'Legal Team',
  },
  {
    id: '6',
    name: 'Mobile',
    slug: 'mobile',
    description: 'Mobile app development and app store optimization',
    agentCount: 5,
    status: 'active',
    lastUpdated: '2024-12-27T14:00:00Z',
    icon: 'smartphone',
    version: '1.0.0',
    author: 'Mobile Team',
  },
];

// ============================================
// Data Fetching Functions (for future API integration)
// ============================================

async function getStudioStats(): Promise<StudioStats> {
  // In production, this would fetch from an API
  // await fetch('/api/studio/stats')
  return mockStats;
}

async function getRecentActivity(): Promise<RecentActivity[]> {
  // In production, this would fetch from an API
  // await fetch('/api/studio/activity?limit=7')
  return mockRecentActivity;
}

async function getPacks(): Promise<PackSummary[]> {
  // In production, this would fetch from an API
  // await fetch('/api/studio/packs?limit=6')
  return mockPacks;
}

// ============================================
// Studio Dashboard Page Component
// ============================================

export default async function StudioPage() {
  // Fetch data in parallel
  const [stats, recentActivity, packs] = await Promise.all([
    getStudioStats(),
    getRecentActivity(),
    getPacks(),
  ]);

  return (
    <Suspense fallback={<PageLoading text="Loading Agent Studio..." />}>
      <StudioDashboard
        stats={stats}
        recentActivity={recentActivity}
        packs={packs}
      />
    </Suspense>
  );
}

// ============================================
// Type Exports
// ============================================

export type { StudioStats, RecentActivity, PackSummary };

// ============================================
// Route Segment Configuration
// ============================================

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds
