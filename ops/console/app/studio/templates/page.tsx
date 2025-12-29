/**
 * AgentOS Studio - Templates Page
 * Browse and manage agent templates
 */

import type { Metadata } from 'next';
import { TemplatesPageContent } from './templates-content';

// ============================================
// Metadata
// ============================================

export const metadata: Metadata = {
  title: 'Templates',
  description: 'Browse and manage agent templates for quick agent creation',
};

// ============================================
// Templates Page
// ============================================

export default function TemplatesPage() {
  return <TemplatesPageContent />;
}
