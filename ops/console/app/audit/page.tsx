/**
 * AgentOS Ops Console - Audit Logs Page
 * Comprehensive audit trail for all system activities
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuditContent } from './audit-content';
import { PageLoading } from '@/components/ui/Spinner';

export const metadata: Metadata = {
  title: 'Audit Logs',
  description: 'View and search system audit logs',
};

export default function AuditPage() {
  return (
    <Suspense fallback={<PageLoading text="Loading audit logs..." />}>
      <AuditContent />
    </Suspense>
  );
}
