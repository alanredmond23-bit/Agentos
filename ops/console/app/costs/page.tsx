/**
 * AgentOS Ops Console - Costs Page
 * Cost tracking and budget management
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CostsContent } from './costs-content';
import { PageLoading } from '@/components/ui/Spinner';

export const metadata: Metadata = {
  title: 'Cost Tracker',
  description: 'Monitor and manage agent spending and budgets',
};

export default function CostsPage() {
  return (
    <Suspense fallback={<PageLoading text="Loading cost data..." />}>
      <CostsContent />
    </Suspense>
  );
}
