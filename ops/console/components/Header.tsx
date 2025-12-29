'use client';

/**
 * AgentOS Ops Console - Header Component
 * Enterprise-grade header with search, notifications, and user menu
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Moon,
  Sun,
  Command,
  ChevronDown,
  Settings,
  User,
  LogOut,
  HelpCircle,
  Activity,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  useUIStore,
  useAuthStore,
  useNotificationsStore,
  useWebSocketStore,
} from '@/lib/store';
import type { Notification } from '@/types';

// ============================================
// Header Component
// ============================================

export function Header() {
  const { theme, setTheme, setCommandPaletteOpen } = useUIStore();
  const { user, logout } = useAuthStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotificationsStore();
  const { isConnected } = useWebSocketStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else if (theme === 'dark') {
      setTheme('system');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (!prefersDark) {
        document.documentElement.classList.remove('dark');
      }
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  };

  const getThemeIcon = () => {
    if (theme === 'dark') return <Moon className="w-5 h-5" />;
    if (theme === 'light') return <Sun className="w-5 h-5" />;
    return (
      <div className="relative w-5 h-5">
        <Sun className="w-5 h-5 absolute inset-0" />
        <Moon className="w-3 h-3 absolute bottom-0 right-0 text-slate-400" />
      </div>
    );
  };

  return (
    <header className="header">
      {/* Left Section - Search */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-3 px-4 py-2 w-72 bg-slate-100 dark:bg-dark-bg-tertiary rounded-lg text-slate-500 dark:text-dark-text-tertiary hover:bg-slate-200 dark:hover:bg-dark-bg-elevated transition-colors group"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left text-sm">Search...</span>
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-white dark:bg-dark-bg-elevated rounded border border-slate-200 dark:border-dark-border-primary text-slate-400 dark:text-dark-text-muted group-hover:border-slate-300 dark:group-hover:border-dark-border-secondary">
            <Command className="w-3 h-3" />K
          </kbd>
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Connection Status */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium',
            isConnected
              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
          )}
        >
          {isConnected ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Disconnected</span>
            </>
          )}
        </div>

        {/* Activity Indicator */}
        <button className="p-2 text-slate-500 dark:text-dark-text-tertiary hover:text-slate-700 dark:hover:text-dark-text-primary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors">
          <Activity className="w-5 h-5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 dark:text-dark-text-tertiary hover:text-slate-700 dark:hover:text-dark-text-primary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors"
          title={`Theme: ${theme}`}
        >
          {getThemeIcon()}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 dark:text-dark-text-tertiary hover:text-slate-700 dark:hover:text-dark-text-primary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-2xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
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
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors"
          >
            <div className="avatar avatar-sm bg-gradient-to-br from-brand-400 to-purple-500">
              <span className="text-white text-xs font-medium">
                {user?.full_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase() || 'OP'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <UserMenuDropdown user={user} onLogout={logout} />
          )}
        </div>
      </div>
    </header>
  );
}

// ============================================
// Notifications Dropdown
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
}: NotificationsDropdownProps) {
  const unreadNotifications = notifications.filter((n) => !n.read);
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="dropdown-menu right-0 top-full mt-2 w-96">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-dark-border-primary">
        <h3 className="font-semibold text-slate-900 dark:text-dark-text-primary">
          Notifications
        </h3>
        {unreadNotifications.length > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {recentNotifications.length > 0 ? (
          <ul>
            {recentNotifications.map((notification) => (
              <li
                key={notification.id}
                className={cn(
                  'px-4 py-3 hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary cursor-pointer transition-colors',
                  !notification.read &&
                    'bg-brand-50/50 dark:bg-brand-500/5'
                )}
                onClick={() => onMarkAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <NotificationIcon type={notification.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                      {notification.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-dark-text-muted mt-1">
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.read && (
                    <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state py-8">
            <Bell className="w-12 h-12 text-slate-300 dark:text-zinc-600 mb-3" />
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
              No notifications yet
            </p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-slate-200 dark:border-dark-border-primary">
        <a
          href="/notifications"
          className="block text-center text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
        >
          View all notifications
        </a>
      </div>
    </div>
  );
}

function NotificationIcon({ type }: { type: Notification['type'] }) {
  const iconClasses = 'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0';

  switch (type) {
    case 'success':
      return (
        <div className={cn(iconClasses, 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400')}>
          <Activity className="w-4 h-4" />
        </div>
      );
    case 'warning':
      return (
        <div className={cn(iconClasses, 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400')}>
          <Bell className="w-4 h-4" />
        </div>
      );
    case 'error':
      return (
        <div className={cn(iconClasses, 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400')}>
          <Bell className="w-4 h-4" />
        </div>
      );
    case 'approval_required':
      return (
        <div className={cn(iconClasses, 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400')}>
          <Bell className="w-4 h-4" />
        </div>
      );
    default:
      return (
        <div className={cn(iconClasses, 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400')}>
          <Bell className="w-4 h-4" />
        </div>
      );
  }
}

// ============================================
// User Menu Dropdown
// ============================================

interface UserMenuDropdownProps {
  user: ReturnType<typeof useAuthStore>['user'];
  onLogout: () => void;
}

function UserMenuDropdown({ user, onLogout }: UserMenuDropdownProps) {
  return (
    <div className="dropdown-menu right-0 top-full mt-2 w-64">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-dark-border-primary">
        <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
          {user?.full_name || 'Operator'}
        </p>
        <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-0.5">
          {user?.email || 'ops@agentos.io'}
        </p>
        <div className="mt-2">
          <span className="badge badge-primary">
            {user?.role || 'Operator'}
          </span>
        </div>
      </div>

      <ul className="py-1">
        <li>
          <a href="/profile" className="dropdown-item">
            <User className="w-4 h-4" />
            <span>Profile</span>
          </a>
        </li>
        <li>
          <a href="/settings" className="dropdown-item">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </a>
        </li>
        <li>
          <a href="/help" className="dropdown-item">
            <HelpCircle className="w-4 h-4" />
            <span>Help & Support</span>
          </a>
        </li>
      </ul>

      <div className="dropdown-divider" />

      <ul className="py-1">
        <li>
          <button onClick={onLogout} className="dropdown-item danger w-full">
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </li>
      </ul>
    </div>
  );
}

export default Header;
