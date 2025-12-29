/**
 * AgentOS Ops Console - Approvals Page
 * Approval queue for agent actions
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ApprovalsContent } from './approvals-content';
import { PageLoading } from '@/components/ui/Spinner';

export const metadata: Metadata = {
  title: 'Approvals',
  description: 'Review and approve agent action requests',
};

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<PageLoading text="Loading approvals..." />}>
      <ApprovalsContent />
    </Suspense>
  );
}
