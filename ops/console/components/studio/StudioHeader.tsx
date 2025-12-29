'use client';

/**
 * AgentOS Agent Studio - Header Component
 * Studio header with search, quick actions, notifications, and user menu
 * Features command palette, notification dropdown, and contextual actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Plus,
  FolderDown,
  Upload,
  Bell,
  Command,
  ChevronDown,
  Bot,
  Package,
  FileCode2,
  Sparkles,
  X,
  Check,
  AlertCircle,
  Info,
  GitCommit,
  Clock,
  Settings,
  User,
  LogOut,
  ChevronRight,
  Zap,
  Layers,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';

// ============================================
// Quick Action Types
// ============================================

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  href?: string;
  onClick?: () => void;
  shortcut?: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'new-agent',
    label: 'New Agent',
    description: 'Create a new agent from scratch',
    icon: Bot,
    href: '/studio/agents/new',
    shortcut: 'N',
  },
  {
    id: 'new-pack',
    label: 'New Pack',
    description: 'Create a new agent pack',
    icon: Package,
    href: '/studio/packs/new',
  },
  {
    id: 'import-yaml',
    label: 'Import YAML',
    description: 'Import agent configuration from YAML',
    icon: Upload,
  },
  {
    id: 'from-template',
    label: 'From Template',
    description: 'Start from a pre-built template',
    icon: FileCode2,
    href: '/studio/templates',
    shortcut: 'T',
  },
  {
    id: 'visual-builder',
    label: 'Visual Builder',
    description: 'Drag and drop agent builder',
    icon: Layers,
    href: '/studio/builder',
  },
];

// ============================================
// Notification Types
// ============================================

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    href: string;
  };
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Deployment Complete',
    message: 'DevOps pack has been deployed successfully to production.',
    timestamp: '2024-12-28T09:15:00Z',
    read: false,
    action: {
      label: 'View Pack',
      href: '/studio/packs/devops',
    },
  },
  {
    id: '2',
    type: 'info',
    title: 'New Template Available',
    message: 'A new "Customer Success Agent" template is now available.',
    timestamp: '2024-12-28T08:30:00Z',
    read: false,
    action: {
      label: 'View Template',
      href: '/studio/templates',
    },
  },
  {
    id: '3',
    type: 'warning',
    title: 'Schema Update Required',
    message: 'QA Pack uses deprecated schema. Update recommended.',
    timestamp: '2024-12-27T16:45:00Z',
    read: true,
    action: {
      label: 'Update Schema',
      href: '/studio/packs/qa',
    },
  },
  {
    id: '4',
    type: 'success',
    title: 'Agent Created',
    message: 'New agent "Data Insights Agent" has been created.',
    timestamp: '2024-12-27T14:20:00Z',
    read: true,
  },
  {
    id: '5',
    type: 'error',
    title: 'Validation Failed',
    message: 'Legal Pack failed validation: missing required field "permissions".',
    timestamp: '2024-12-27T11:00:00Z',
    read: true,
    action: {
      label: 'Fix Issue',
      href: '/studio/packs/legal',
    },
  },
];

// ============================================
// Breadcrumb Configuration
// ============================================

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

function useBreadcrumbs(): BreadcrumbSegment[] {
  const pathname = usePathname();
  const segments: BreadcrumbSegment[] = [{ label: 'Studio', href: '/studio' }];

  const parts = pathname.split('/').filter(Boolean);

  if (parts.length > 1) {
    // Build breadcrumbs from path
    for (let i = 1; i < parts.length; i++) {
      const segment = parts[i] || '';
      const href = '/' + parts.slice(0, i + 1).join('/');
      let label = segment.charAt(0).toUpperCase() + segment.slice(1);

      // Handle special cases
      if (segment === 'agents') label = 'Agents';
      else if (segment === 'packs') label = 'Packs';
      else if (segment === 'templates') label = 'Templates';
      else if (segment === 'graph') label = 'Dependency Graph';
      else if (segment === 'new') label = 'New';
      else if (segment.includes('-')) {
        // Convert kebab-case to Title Case
        label = segment.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }

      segments.push({
        label,
        href: i === parts.length - 1 ? undefined : href,
      });
    }
  }

  return segments;
}

// ============================================
// Studio Header Component
// ============================================

export function StudioHeader() {
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const breadcrumbs = useBreadcrumbs();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setShowQuickActions(false);
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Would open command palette
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-dark-bg-primary border-b border-slate-200 dark:border-dark-border-primary">
      {/* Main Header Row */}
      <div className="h-16 px-6 flex items-center justify-between">
        {/* Left Section - Breadcrumbs & Search */}
        <div className="flex items-center gap-6">
          {/* Breadcrumbs */}
          <nav className="hidden lg:flex items-center" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1">
              {breadcrumbs.map((segment, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 mx-1 text-slate-300 dark:text-dark-border-secondary" />
                  )}
                  {segment.href ? (
                    <Link
                      href={segment.href}
                      className="text-sm text-slate-500 dark:text-dark-text-tertiary hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    >
                      {segment.label}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                      {segment.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* Search Button */}
          <button
            className="flex items-center gap-3 px-4 py-2 w-72 bg-slate-100 dark:bg-dark-bg-tertiary rounded-lg text-slate-500 dark:text-dark-text-tertiary hover:bg-slate-200 dark:hover:bg-dark-bg-elevated transition-colors group"
            onClick={() => {
              // Open command palette
            }}
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left text-sm">Search agents, packs...</span>
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-white dark:bg-dark-bg-elevated rounded border border-slate-200 dark:border-dark-border-primary text-slate-400 dark:text-dark-text-muted group-hover:border-slate-300 dark:group-hover:border-dark-border-secondary">
              <Command className="w-3 h-3" />K
            </kbd>
          </button>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Actions Dropdown */}
          <div className="relative" data-dropdown>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickActions(!showQuickActions);
                setShowNotifications(false);
                setShowUserMenu(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create</span>
              <ChevronDown className={cn('w-4 h-4 transition-transform', showQuickActions && 'rotate-180')} />
            </button>

            {showQuickActions && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-dark-bg-elevated rounded-xl shadow-lg border border-slate-200 dark:border-dark-border-primary z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-dark-border-primary">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-dark-text-muted">
                    Quick Actions
                  </p>
                </div>
                <ul className="py-2">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    const content = (
                      <div className="flex items-start gap-3 px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors cursor-pointer">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                              {action.label}
                            </p>
                            {action.shortcut && (
                              <kbd className="px-1.5 py-0.5 text-2xs font-medium bg-slate-100 dark:bg-dark-bg-tertiary rounded text-slate-400 dark:text-dark-text-muted">
                                {action.shortcut}
                              </kbd>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-0.5">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    );

                    return (
                      <li key={action.id}>
                        {action.href ? (
                          <Link href={action.href} onClick={() => setShowQuickActions(false)}>
                            {content}
                          </Link>
                        ) : (
                          <button
                            className="w-full text-left"
                            onClick={() => {
                              action.onClick?.();
                              setShowQuickActions(false);
                            }}
                          >
                            {content}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Browse Packs Button */}
          <Link
            href="/studio/packs"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-dark-bg-tertiary hover:bg-slate-200 dark:hover:bg-dark-bg-elevated text-slate-700 dark:text-dark-text-primary text-sm font-medium rounded-lg transition-colors"
          >
            <FolderDown className="w-4 h-4" />
            <span className="hidden md:inline">Browse Packs</span>
          </Link>

          {/* Import YAML Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-dark-bg-tertiary hover:bg-slate-200 dark:hover:bg-dark-bg-elevated text-slate-700 dark:text-dark-text-primary text-sm font-medium rounded-lg transition-colors">
            <Upload className="w-4 h-4" />
            <span className="hidden md:inline">Import</span>
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-slate-200 dark:bg-dark-border-primary mx-1" />

          {/* AI Assist Button */}
          <button
            className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
            title="AI Assist"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <div className="relative" data-dropdown>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifications(!showNotifications);
                setShowQuickActions(false);
                setShowUserMenu(false);
              }}
              className="relative p-2 text-slate-500 dark:text-dark-text-tertiary hover:text-slate-700 dark:hover:text-dark-text-primary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-2xs font-bold bg-purple-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <NotificationsDropdown
                notifications={notifications}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onClose={() => setShowNotifications(false)}
              />
            )}
          </div>

          {/* User Menu */}
          <div className="relative" data-dropdown>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowUserMenu(!showUserMenu);
                setShowQuickActions(false);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-sm font-medium">
                SC
              </div>
              <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', showUserMenu && 'rotate-180')} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-dark-bg-elevated rounded-xl shadow-lg border border-slate-200 dark:border-dark-border-primary z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-dark-border-primary">
                  <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                    Sarah Chen
                  </p>
                  <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                    sarah@company.com
                  </p>
                </div>
                <ul className="py-2">
                  <li>
                    <Link
                      href="/studio/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Studio Settings
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                  </li>
                </ul>
                <div className="border-t border-slate-100 dark:border-dark-border-primary py-2">
                  <button className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// ============================================
// Notifications Dropdown Component
// ============================================

interface NotificationsDropdownProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

function NotificationsDropdown({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: NotificationsDropdownProps) {
  const notificationIcons: Record<Notification['type'], React.ElementType> = {
    success: Check,
    error: AlertCircle,
    warning: AlertCircle,
    info: Info,
  };

  const notificationColors: Record<Notification['type'], string> = {
    success: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
    error: 'text-red-500 bg-red-50 dark:bg-red-500/10',
    warning: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
    info: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-dark-bg-elevated rounded-xl shadow-lg border border-slate-200 dark:border-dark-border-primary z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-dark-border-primary">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-2xs font-semibold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-dark-text-muted mb-2" />
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
              No notifications
            </p>
          </div>
        ) : (
          <ul>
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type];
              const colorClass = notificationColors[notification.type];

              return (
                <li
                  key={notification.id}
                  className={cn(
                    'border-b border-slate-100 dark:border-dark-border-primary last:border-0',
                    !notification.read && 'bg-purple-50/50 dark:bg-purple-500/5'
                  )}
                >
                  <div className="flex items-start gap-3 p-4">
                    <div className={cn('p-2 rounded-lg', colorClass)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <button
                            onClick={() => onMarkAsRead(notification.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-dark-text-secondary"
                            title="Mark as read"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-0.5">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-2xs text-slate-400 dark:text-dark-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(notification.timestamp)}
                        </span>
                        {notification.action && (
                          <Link
                            href={notification.action.href}
                            onClick={onClose}
                            className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                          >
                            {notification.action.label}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 dark:border-dark-border-primary p-2">
        <Link
          href="/studio/notifications"
          onClick={onClose}
          className="block w-full py-2 text-center text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
        >
          View All Notifications
        </Link>
      </div>
    </div>
  );
}

export default StudioHeader;
