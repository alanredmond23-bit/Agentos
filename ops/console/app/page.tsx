/**
 * AgentOS Ops Console - Dashboard Page
 * Main dashboard with metrics, agent activity, and quick actions
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { DashboardContent } from './dashboard-content';
import { PageLoading } from '@/components/ui/Spinner';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'AgentOS operations dashboard overview',
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageLoading text="Loading dashboard..." />}>
      <DashboardContent />
    </Suspense>
  );
}
