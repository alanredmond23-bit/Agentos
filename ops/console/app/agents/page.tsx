/**
 * AgentOS Ops Console - Agents Page
 * Agent listing with filtering, sorting, and management
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AgentsContent } from './agents-content';
import { PageLoading } from '@/components/ui/Spinner';

export const metadata: Metadata = {
  title: 'Agents',
  description: 'Manage and monitor AI agents',
};

export default function AgentsPage() {
  return (
    <Suspense fallback={<PageLoading text="Loading agents..." />}>
      <AgentsContent />
    </Suspense>
  );
}
