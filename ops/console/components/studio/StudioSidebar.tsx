'use client';

/**
 * AgentOS Agent Studio - Sidebar Navigation
 * Studio-specific navigation with purple accent theme
 * Includes collapsible sections, keyboard shortcuts, and pack quick-switch
 */

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Bot,
  FileCode2,
  GitBranch,
  Settings,
  HelpCircle,
  Palette,
  ChevronRight,
  ChevronDown,
  Sparkles,
  FolderTree,
  Layers,
  Zap,
  Search,
  Plus,
  History,
  Star,
  Pin,
  MoreHorizontal,
  ExternalLink,
  Keyboard,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Navigation Configuration
// ============================================

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: 'purple' | 'emerald' | 'amber' | 'red';
  shortcut?: string;
  external?: boolean;
}

interface NavSection {
  id: string;
  title?: string;
  items: NavItem[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const navigationSections: NavSection[] = [
  {
    id: 'main',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/studio',
        icon: LayoutDashboard,
        shortcut: 'G D',
      },
      {
        id: 'packs',
        label: 'Packs',
        href: '/studio/packs',
        icon: Package,
        badge: '16',
        badgeColor: 'purple',
        shortcut: 'G P',
      },
      {
        id: 'agents',
        label: 'Agents',
        href: '/studio/agents',
        icon: Bot,
        badge: '98',
        badgeColor: 'purple',
        shortcut: 'G A',
      },
      {
        id: 'templates',
        label: 'Templates',
        href: '/studio/templates',
        icon: FileCode2,
        shortcut: 'G T',
      },
      {
        id: 'graph',
        label: 'Dependency Graph',
        href: '/studio/graph',
        icon: GitBranch,
        shortcut: 'G G',
      },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    collapsible: true,
    items: [
      {
        id: 'builder',
        label: 'Visual Builder',
        href: '/studio/builder',
        icon: Layers,
        badge: 'Beta',
        badgeColor: 'emerald',
      },
      {
        id: 'capabilities',
        label: 'Capabilities',
        href: '/studio/capabilities',
        icon: Sparkles,
      },
      {
        id: 'files',
        label: 'File Browser',
        href: '/studio/files',
        icon: FolderTree,
      },
      {
        id: 'history',
        label: 'Version History',
        href: '/studio/history',
        icon: History,
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    collapsible: true,
    defaultCollapsed: true,
    items: [
      {
        id: 'preferences',
        label: 'Preferences',
        href: '/studio/settings',
        icon: Settings,
      },
      {
        id: 'themes',
        label: 'Theme Editor',
        href: '/studio/themes',
        icon: Palette,
      },
      {
        id: 'shortcuts',
        label: 'Keyboard Shortcuts',
        href: '/studio/shortcuts',
        icon: Keyboard,
      },
    ],
  },
];

// ============================================
// Recent/Favorites Quick Access
// ============================================

interface QuickAccessItem {
  id: string;
  name: string;
  type: 'pack' | 'agent';
  href: string;
  pinned?: boolean;
}

const quickAccessItems: QuickAccessItem[] = [
  { id: '1', name: 'DevOps Pack', type: 'pack', href: '/studio/packs/devops', pinned: true },
  { id: '2', name: 'CI/CD Pipeline Agent', type: 'agent', href: '/studio/agents/cicd-pipeline', pinned: true },
  { id: '3', name: 'QA Testing Pack', type: 'pack', href: '/studio/packs/qa' },
  { id: '4', name: 'Research Assistant', type: 'agent', href: '/studio/agents/research-assistant' },
];

// ============================================
// Studio Sidebar Component
// ============================================

export function StudioSidebar() {
  const pathname = usePathname();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(
      navigationSections
        .filter((s) => s.defaultCollapsed)
        .map((s) => s.id)
    )
  );
  const [showQuickAccess, setShowQuickAccess] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Toggle section collapse
  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Handle 'G' prefix shortcuts for navigation
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        // This would set up a mode for the next key press
        // For now, we'll skip this advanced feature
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-dark-bg-primary border-r border-slate-200 dark:border-dark-border-primary flex flex-col"
      role="navigation"
      aria-label="Studio navigation"
    >
      {/* Logo Section */}
      <div className="flex items-center h-16 px-4 border-b border-slate-200 dark:border-dark-border-primary">
        <Link href="/studio" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-shadow">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-900 dark:text-dark-text-primary">
              Agent Studio
            </span>
            <span className="text-xs text-slate-500 dark:text-dark-text-tertiary -mt-0.5">
              Pack Builder
            </span>
          </div>
        </Link>
      </div>

      {/* Search Box */}
      <div className="px-3 py-3 border-b border-slate-100 dark:border-dark-border-primary">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-dark-text-muted" />
          <input
            type="text"
            placeholder="Quick search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-dark-bg-tertiary rounded-lg border border-transparent focus:border-purple-300 dark:focus:border-purple-500/50 focus:bg-white dark:focus:bg-dark-bg-elevated outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-dark-text-muted"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center px-1.5 py-0.5 text-2xs font-medium bg-white dark:bg-dark-bg-elevated rounded border border-slate-200 dark:border-dark-border-primary text-slate-400 dark:text-dark-text-muted">
            /
          </kbd>
        </div>
      </div>

      {/* Quick Create Button */}
      <div className="px-3 py-3">
        <Link
          href="/studio/agents/new"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Agent</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-3">
        {navigationSections.map((section) => {
          const isCollapsed = collapsedSections.has(section.id);

          return (
            <div key={section.id} className="mb-4">
              {section.title && (
                <button
                  onClick={() => section.collapsible && toggleSection(section.id)}
                  className={cn(
                    'flex items-center justify-between w-full px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-dark-text-muted',
                    section.collapsible && 'hover:text-slate-700 dark:hover:text-dark-text-secondary cursor-pointer'
                  )}
                >
                  <span>{section.title}</span>
                  {section.collapsible && (
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 transition-transform',
                        isCollapsed && '-rotate-90'
                      )}
                    />
                  )}
                </button>
              )}
              {!isCollapsed && (
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/studio' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          target={item.external ? '_blank' : undefined}
                          rel={item.external ? 'noopener noreferrer' : undefined}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                            isActive
                              ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400'
                              : 'text-slate-600 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary hover:text-slate-900 dark:hover:text-dark-text-primary'
                          )}
                        >
                          <Icon
                            className={cn(
                              'w-5 h-5 flex-shrink-0',
                              isActive
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-slate-400 dark:text-dark-text-muted'
                            )}
                          />
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span
                              className={cn(
                                'px-2 py-0.5 text-2xs font-semibold rounded-full',
                                item.badgeColor === 'purple' &&
                                  'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
                                item.badgeColor === 'emerald' &&
                                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
                                item.badgeColor === 'amber' &&
                                  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
                                item.badgeColor === 'red' &&
                                  'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
                                !item.badgeColor &&
                                  'bg-slate-100 text-slate-600 dark:bg-zinc-700 dark:text-zinc-300'
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                          {item.shortcut && (
                            <kbd className="hidden group-hover:flex items-center px-1.5 py-0.5 text-2xs font-medium bg-slate-100 dark:bg-dark-bg-tertiary rounded text-slate-400 dark:text-dark-text-muted">
                              {item.shortcut}
                            </kbd>
                          )}
                          {item.external && (
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-dark-text-muted" />
                          )}
                          {isActive && !item.shortcut && (
                            <ChevronRight className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

        {/* Quick Access Section */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-dark-border-primary">
          <button
            onClick={() => setShowQuickAccess(!showQuickAccess)}
            className="flex items-center justify-between w-full px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-dark-text-muted hover:text-slate-700 dark:hover:text-dark-text-secondary"
          >
            <span className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5" />
              Quick Access
            </span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 transition-transform',
                !showQuickAccess && '-rotate-90'
              )}
            />
          </button>
          {showQuickAccess && (
            <ul className="space-y-0.5">
              {quickAccessItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary transition-colors group"
                  >
                    {item.type === 'pack' ? (
                      <Package className="w-4 h-4 text-slate-400 dark:text-dark-text-muted" />
                    ) : (
                      <Bot className="w-4 h-4 text-slate-400 dark:text-dark-text-muted" />
                    )}
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.pinned && (
                      <Pin className="w-3.5 h-3.5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-slate-200 dark:border-dark-border-primary">
        {/* Theme Toggle */}
        <div className="p-3 border-b border-slate-100 dark:border-dark-border-primary">
          <ThemeToggle />
        </div>

        {/* Back to Ops Console Link */}
        <div className="p-3 border-b border-slate-100 dark:border-dark-border-primary">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>Back to Ops Console</span>
          </Link>
        </div>

        {/* Help Button */}
        <div className="p-3">
          <Link
            href="/studio/help"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary transition-colors"
          >
            <HelpCircle className="w-5 h-5 text-slate-400 dark:text-dark-text-muted" />
            <span>Help & Documentation</span>
            <kbd className="ml-auto px-1.5 py-0.5 text-2xs font-medium bg-slate-100 dark:bg-dark-bg-tertiary rounded text-slate-400 dark:text-dark-text-muted">
              ?
            </kbd>
          </Link>
        </div>
      </div>
    </aside>
  );
}

// ============================================
// Theme Toggle Component
// ============================================

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial theme
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const newValue = !isDark;
    setIsDark(newValue);
    document.documentElement.classList.toggle('dark', newValue);
    localStorage.setItem('theme', newValue ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="flex items-center gap-3">
        {isDark ? (
          <Moon className="w-5 h-5 text-slate-400 dark:text-dark-text-muted" />
        ) : (
          <Sun className="w-5 h-5 text-slate-400 dark:text-dark-text-muted" />
        )}
        <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
      </span>
      <div
        className={cn(
          'w-9 h-5 rounded-full transition-colors relative',
          isDark ? 'bg-purple-600' : 'bg-slate-200 dark:bg-dark-bg-tertiary'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
            isDark ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </div>
    </button>
  );
}

export default StudioSidebar;
