/**
 * AgentOS Ops Console - Pack Header Component
 * Header section with pack icon, name, version, actions
 */

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  Download,
  RefreshCw,
  Trash2,
  MoreVertical,
  ExternalLink,
  GitBranch,
  Calendar,
  User,
  Tag,
  Shield,
  CheckCircle,
  AlertTriangle,
  Star,
  ChevronDown,
} from 'lucide-react';
import { cn, formatRelativeTime, formatNumber, formatCompactNumber } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { PackData } from './PackDetail';

// ============================================
// Type Definitions
// ============================================

interface PackHeaderProps {
  pack: PackData;
  onUpdate?: () => Promise<void>;
  onUninstall?: () => Promise<void>;
  showBreadcrumb?: boolean;
  compact?: boolean;
}

interface VersionSelectorProps {
  currentVersion: string;
  availableVersions?: string[];
  onVersionChange?: (version: string) => void;
}

// ============================================
// Lifecycle Badge Component
// ============================================

function LifecycleBadge({ lifecycle }: { lifecycle: PackData['lifecycle'] }) {
  const config: Record<
    PackData['lifecycle'],
    { variant: 'success' | 'warning' | 'info' | 'error'; label: string; description: string }
  > = {
    stable: {
      variant: 'success',
      label: 'Stable',
      description: 'Production-ready, fully tested',
    },
    beta: {
      variant: 'info',
      label: 'Beta',
      description: 'Feature complete, testing in progress',
    },
    alpha: {
      variant: 'warning',
      label: 'Alpha',
      description: 'Early development, expect changes',
    },
    deprecated: {
      variant: 'error',
      label: 'Deprecated',
      description: 'No longer maintained',
    },
  };

  const { variant, label } = config[lifecycle];

  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  );
}

// ============================================
// Version Selector Component
// ============================================

function VersionSelector({
  currentVersion,
  availableVersions = [],
  onVersionChange,
}: VersionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Mock versions if not provided
  const versions = availableVersions.length > 0
    ? availableVersions
    : [currentVersion, '2.3.0', '2.2.5', '2.2.0', '2.1.0'];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium text-slate-700 dark:text-dark-text-secondary bg-slate-100 dark:bg-dark-bg-tertiary rounded-lg border border-slate-200 dark:border-dark-border-primary hover:bg-slate-200 dark:hover:bg-dark-bg-elevated transition-colors"
      >
        <span>v{currentVersion}</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-dark-bg-elevated rounded-xl shadow-lg border border-slate-200 dark:border-dark-border-primary z-20 py-1 animate-fade-in-down">
            {versions.map((version) => (
              <button
                key={version}
                onClick={() => {
                  onVersionChange?.(version);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm transition-colors',
                  version === currentVersion
                    ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium'
                    : 'text-slate-700 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary'
                )}
              >
                <span>v{version}</span>
                {version === currentVersion && (
                  <span className="ml-2 text-xs text-slate-400 dark:text-dark-text-muted">
                    (current)
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Pack Actions Menu
// ============================================

interface PackActionsMenuProps {
  pack: PackData;
  onClose: () => void;
  onUninstall: () => void;
}

function PackActionsMenu({ pack, onClose, onUninstall }: PackActionsMenuProps) {
  React.useEffect(() => {
    const handleClickOutside = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="dropdown-menu right-0 top-full mt-1 w-52"
      onClick={(e) => e.stopPropagation()}
    >
      <ul className="py-1">
        {pack.repository && (
          <li>
            <a
              href={pack.repository}
              target="_blank"
              rel="noopener noreferrer"
              className="dropdown-item"
            >
              <GitBranch className="w-4 h-4" />
              <span>View Repository</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </a>
          </li>
        )}
        {pack.homepage && (
          <li>
            <a
              href={pack.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="dropdown-item"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Homepage</span>
            </a>
          </li>
        )}
        <li>
          <button className="dropdown-item w-full">
            <Download className="w-4 h-4" />
            <span>Export Configuration</span>
          </button>
        </li>
        <li>
          <button className="dropdown-item w-full">
            <Star className="w-4 h-4" />
            <span>Add to Favorites</span>
          </button>
        </li>
      </ul>
      <div className="dropdown-divider" />
      <ul className="py-1">
        <li>
          <button className="dropdown-item danger w-full" onClick={onUninstall}>
            <Trash2 className="w-4 h-4" />
            <span>Uninstall Pack</span>
          </button>
        </li>
      </ul>
    </div>
  );
}

// ============================================
// Pack Stats Bar Component
// ============================================

interface PackStatsBarProps {
  pack: PackData;
}

function PackStatsBar({ pack }: PackStatsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-6 text-sm">
      <div className="flex items-center gap-2 text-slate-500 dark:text-dark-text-tertiary">
        <User className="w-4 h-4" />
        <span>{pack.author.name}</span>
      </div>
      <div className="flex items-center gap-2 text-slate-500 dark:text-dark-text-tertiary">
        <Shield className="w-4 h-4" />
        <span>{pack.license}</span>
      </div>
      <div className="flex items-center gap-2 text-slate-500 dark:text-dark-text-tertiary">
        <Calendar className="w-4 h-4" />
        <span>Updated {formatRelativeTime(pack.updatedAt)}</span>
      </div>
      <div className="flex items-center gap-2 text-slate-500 dark:text-dark-text-tertiary">
        <Star className="w-4 h-4" />
        <span>{formatCompactNumber(Math.floor(Math.random() * 5000 + 500))} stars</span>
      </div>
      <div className="flex items-center gap-2 text-slate-500 dark:text-dark-text-tertiary">
        <Download className="w-4 h-4" />
        <span>{formatCompactNumber(pack.totalExecutions)} downloads</span>
      </div>
      {pack.installedAt && (
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="w-4 h-4" />
          <span>Installed</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// Pack Header Component
// ============================================

export function PackHeader({
  pack,
  onUpdate,
  onUninstall,
  showBreadcrumb = true,
  compact = false,
}: PackHeaderProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);

  const handleUpdate = useCallback(async () => {
    setIsUpdating(true);
    try {
      if (onUpdate) {
        await onUpdate();
      } else {
        // Default update simulation
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      console.log('Pack updated successfully');
    } catch (error) {
      console.error('Failed to update pack:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [onUpdate]);

  const handleUninstall = useCallback(async () => {
    if (
      !window.confirm(
        `Are you sure you want to uninstall ${pack.name}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsUninstalling(true);
    try {
      if (onUninstall) {
        await onUninstall();
      } else {
        // Default uninstall simulation
        await new Promise((resolve) => setTimeout(resolve, 2000));
        router.push('/studio/packs');
      }
    } catch (error) {
      console.error('Failed to uninstall pack:', error);
    } finally {
      setIsUninstalling(false);
    }
  }, [pack.name, router, onUninstall]);

  return (
    <div className="space-y-4">
      {/* Breadcrumb & Back Button */}
      {showBreadcrumb && (
        <div className="flex items-center gap-3">
          <Link
            href="/studio/packs"
            className="p-2 text-slate-400 hover:text-slate-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary rounded-lg hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary transition-colors"
            aria-label="Back to packs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <nav className="text-sm text-slate-500 dark:text-dark-text-tertiary">
            <Link
              href="/studio/packs"
              className="hover:text-brand-600 dark:hover:text-brand-400"
            >
              Packs
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-900 dark:text-dark-text-primary font-medium">
              {pack.name}
            </span>
          </nav>
        </div>
      )}

      {/* Pack Header Card */}
      <Card>
        <CardContent className={cn('p-6', compact && 'p-4')}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Pack Info */}
            <div className="flex items-start gap-4">
              {/* Pack Icon */}
              <div
                className={cn(
                  'rounded-xl bg-gradient-to-br from-purple-500 to-brand-600 flex items-center justify-center shadow-lg',
                  compact ? 'w-12 h-12' : 'w-16 h-16'
                )}
              >
                <Package className={cn('text-white', compact ? 'w-6 h-6' : 'w-8 h-8')} />
              </div>

              <div className="flex-1 min-w-0">
                {/* Name & Badges */}
                <div className="flex items-center gap-3 flex-wrap">
                  <h1
                    className={cn(
                      'font-bold text-slate-900 dark:text-dark-text-primary',
                      compact ? 'text-xl' : 'text-2xl'
                    )}
                  >
                    {pack.name}
                  </h1>
                  <LifecycleBadge lifecycle={pack.lifecycle} />
                  <VersionSelector currentVersion={pack.version} />
                </div>

                {/* Description */}
                <p
                  className={cn(
                    'text-slate-600 dark:text-dark-text-secondary max-w-2xl',
                    compact ? 'mt-1 text-sm' : 'mt-2'
                  )}
                >
                  {pack.description}
                </p>

                {/* Tags */}
                {!compact && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pack.tags.slice(0, 6).map((tag) => (
                      <Badge key={tag} variant="default" size="sm">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                    {pack.tags.length > 6 && (
                      <Badge variant="outline" size="sm">
                        +{pack.tags.length - 6} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Stats */}
                {!compact && (
                  <div className="mt-4">
                    <PackStatsBar pack={pack} />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {pack.installedAt ? (
                <Button
                  variant="secondary"
                  size={compact ? 'sm' : 'md'}
                  leftIcon={
                    <RefreshCw
                      className={cn('w-4 h-4', isUpdating && 'animate-spin')}
                    />
                  }
                  onClick={handleUpdate}
                  loading={isUpdating}
                  loadingText="Updating..."
                >
                  Check for Updates
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size={compact ? 'sm' : 'md'}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Install Pack
                </Button>
              )}

              <div className="relative">
                <IconButton
                  variant="secondary"
                  size={compact ? 'sm' : 'md'}
                  icon={<MoreVertical className="w-4 h-4" />}
                  aria-label="More options"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                />
                {showMenu && (
                  <PackActionsMenu
                    pack={pack}
                    onClose={() => setShowMenu(false)}
                    onUninstall={handleUninstall}
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deprecated Warning */}
      {pack.lifecycle === 'deprecated' && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              This pack is deprecated
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              This pack is no longer actively maintained. Consider migrating to an
              alternative solution.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PackHeader;
