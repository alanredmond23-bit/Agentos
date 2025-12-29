/**
 * AgentOS Agent Studio - Layout
 * Secondary layout with studio-specific sidebar and header
 * Provides the foundational structure for the entire Studio
 */

import type { Metadata } from 'next';
import { StudioSidebar } from '@/components/studio/StudioSidebar';
import { StudioHeader } from '@/components/studio/StudioHeader';

// ============================================
// Metadata Configuration
// ============================================

export const metadata: Metadata = {
  title: {
    default: 'Agent Studio',
    template: '%s | Agent Studio',
  },
  description: 'Create, configure, and manage AI agent packs',
  keywords: ['AI agents', 'agent packs', 'configuration', 'automation'],
  openGraph: {
    title: 'Agent Studio | AgentOS',
    description: 'Build, configure, and deploy AI agent packs with visual tools',
    type: 'website',
  },
};

// ============================================
// Studio Layout Types
// ============================================

interface StudioLayoutProps {
  children: React.ReactNode;
}

// ============================================
// Studio Context Types (for future use)
// ============================================

export interface StudioContextValue {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  activeSection: string | null;
  setActiveSection: (section: string | null) => void;
  unsavedChanges: boolean;
  setUnsavedChanges: (value: boolean) => void;
}

// ============================================
// Studio Layout Component
// ============================================

export default function StudioLayout({ children }: StudioLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-dark-bg-secondary">
      {/* Skip to main content link for accessibility */}
      <a
        href="#studio-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Studio Sidebar Navigation */}
      <StudioSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-64 transition-[margin] duration-300 ease-in-out">
        {/* Studio Header */}
        <StudioHeader />

        {/* Page Content */}
        <main
          id="studio-main-content"
          className="flex-1 overflow-y-auto"
          role="main"
          aria-label="Studio content"
        >
          <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>

        {/* Footer */}
        <StudioFooter />
      </div>

      {/* Global Studio UI Elements */}
      <StudioCommandPalette />
      <StudioToastContainer />
      <StudioKeyboardShortcuts />
    </div>
  );
}

// ============================================
// Studio Footer Component
// ============================================

function StudioFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-primary px-6 py-4">
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-dark-text-tertiary">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Agent Studio v1.0.0
          </span>
          <span className="text-slate-300 dark:text-dark-border-secondary">|</span>
          <span>16 Packs Available</span>
          <span className="text-slate-300 dark:text-dark-border-secondary">|</span>
          <span>98 Agents Active</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/docs/studio"
            className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            Documentation
          </a>
          <a
            href="/studio/templates"
            className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            Templates
          </a>
          <a
            href="https://github.com/your-org/agent-packs"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            GitHub
          </a>
          <a
            href="/help"
            className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            Support
          </a>
        </div>
      </div>

      {/* Copyright */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-dark-border-primary text-xs text-slate-400 dark:text-dark-text-muted flex items-center justify-between">
        <span>Built with the AgentOS Platform</span>
        <div className="flex items-center gap-3">
          <span>Keyboard shortcuts: Press</span>
          <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-dark-bg-tertiary rounded text-slate-500 dark:text-dark-text-tertiary">?</kbd>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// Studio Command Palette Placeholder
// ============================================

function StudioCommandPalette() {
  // Placeholder for studio-specific command palette
  // Would include: Create Agent, Switch Pack, Quick Navigation, etc.
  // This will be implemented as a client component with full functionality
  return (
    <div
      id="studio-command-palette"
      className="hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    />
  );
}

// ============================================
// Studio Toast Container
// ============================================

function StudioToastContainer() {
  return (
    <div
      id="studio-toast-container"
      className="fixed bottom-4 right-4 z-[var(--z-toast)] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Studio Notifications"
    >
      {/* Toast notifications will be rendered here dynamically */}
    </div>
  );
}

// ============================================
// Studio Keyboard Shortcuts Manager
// ============================================

function StudioKeyboardShortcuts() {
  // This component manages global keyboard shortcuts for the Studio
  // Shortcuts include:
  // - Cmd/Ctrl + K: Open command palette
  // - Cmd/Ctrl + N: New agent
  // - Cmd/Ctrl + P: Quick pack switch
  // - Cmd/Ctrl + S: Save current work
  // - Escape: Close modals/dialogs
  // - ?: Show keyboard shortcuts help
  return (
    <div
      id="studio-keyboard-shortcuts"
      className="hidden"
      data-shortcuts={JSON.stringify({
        'cmd+k': 'openCommandPalette',
        'cmd+n': 'newAgent',
        'cmd+p': 'quickPackSwitch',
        'cmd+s': 'save',
        escape: 'closeModal',
        '?': 'showKeyboardShortcuts',
      })}
    />
  );
}

// ============================================
// Breadcrumb Types
// ============================================

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

// ============================================
// Studio Page Header Component
// ============================================

export interface StudioPageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
}

// ============================================
// Exports
// ============================================

export { StudioLayout };
