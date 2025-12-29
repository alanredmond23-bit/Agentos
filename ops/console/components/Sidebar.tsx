'use client';

/**
 * AgentOS Ops Console - Sidebar Navigation
 * Enterprise-grade navigation component
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  CheckCircle2,
  FileText,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield,
  BarChart3,
  Users,
  Bell,
  LogOut,
  Palette,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore, useApprovalsStore, useAuthStore } from '@/lib/store';

// ============================================
// Navigation Configuration
// ============================================

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  badgeColor?: 'default' | 'warning' | 'error';
}

interface NavSection {
  id: string;
  title?: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    id: 'main',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
      },
      {
        id: 'agents',
        label: 'Agents',
        href: '/agents',
        icon: Bot,
      },
      {
        id: 'approvals',
        label: 'Approvals',
        href: '/approvals',
        icon: CheckCircle2,
      },
      {
        id: 'audit',
        label: 'Audit Logs',
        href: '/audit',
        icon: FileText,
      },
      {
        id: 'costs',
        label: 'Costs',
        href: '/costs',
        icon: DollarSign,
      },
    ],
  },
  {
    id: 'studio',
    title: 'Studio',
    items: [
      {
        id: 'studio-dashboard',
        label: 'Agent Studio',
        href: '/studio',
        icon: Palette,
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    items: [
      {
        id: 'metrics',
        label: 'Metrics',
        href: '/metrics',
        icon: BarChart3,
      },
      {
        id: 'security',
        label: 'Security',
        href: '/security',
        icon: Shield,
      },
    ],
  },
  {
    id: 'management',
    title: 'Management',
    items: [
      {
        id: 'team',
        label: 'Team',
        href: '/team',
        icon: Users,
      },
      {
        id: 'settings',
        label: 'Settings',
        href: '/settings',
        icon: Settings,
      },
    ],
  },
];

// ============================================
// Sidebar Component
// ============================================

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { pendingCount } = useApprovalsStore();
  const { user, logout } = useAuthStore();

  // Get navigation with dynamic badges
  const getNavItemBadge = (itemId: string): number | undefined => {
    if (itemId === 'approvals') {
      return pendingCount > 0 ? pendingCount : undefined;
    }
    return undefined;
  };

  return (
    <aside
      className={cn(
        'sidebar',
        sidebarCollapsed && 'sidebar-collapsed'
      )}
    >
      {/* Logo Section */}
      <div className="flex items-center h-16 px-4 border-b border-slate-200 dark:border-dark-border-primary">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900 dark:text-dark-text-primary">
                AgentOS
              </span>
              <span className="text-xs text-slate-500 dark:text-dark-text-tertiary -mt-0.5">
                Ops Console
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navigationSections.map((section) => (
          <div key={section.id} className="mb-6">
            {section.title && !sidebarCollapsed && (
              <h3 className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-dark-text-muted">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const badge = getNavItemBadge(item.id);
                const Icon = item.icon;

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={cn(
                        'sidebar-nav-item',
                        isActive && 'active',
                        sidebarCollapsed && 'justify-center px-2'
                      )}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {badge !== undefined && (
                            <span
                              className={cn(
                                'badge',
                                badge > 0 ? 'badge-warning' : 'badge-neutral'
                              )}
                            >
                              {badge > 99 ? '99+' : badge}
                            </span>
                          )}
                        </>
                      )}
                      {sidebarCollapsed && badge !== undefined && badge > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="border-t border-slate-200 dark:border-dark-border-primary p-3">
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="avatar avatar-md bg-gradient-to-br from-brand-400 to-purple-500">
              <span className="text-white font-medium">
                {user?.full_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase() || 'OP'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary truncate">
                {user?.full_name || 'Operator'}
              </p>
              <p className="text-xs text-slate-500 dark:text-dark-text-tertiary truncate">
                {user?.email || 'ops@agentos.io'}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-slate-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary rounded-lg hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-full p-2 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary rounded-lg hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-dark-bg-elevated border border-slate-200 dark:border-dark-border-primary rounded-full shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary transition-colors z-50"
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Help Button */}
      <div className="absolute bottom-20 left-0 right-0 px-3">
        <Link
          href="/help"
          className={cn(
            'sidebar-nav-item',
            sidebarCollapsed && 'justify-center px-2'
          )}
        >
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          {!sidebarCollapsed && <span>Help & Support</span>}
        </Link>
      </div>
    </aside>
  );
}

export default Sidebar;
