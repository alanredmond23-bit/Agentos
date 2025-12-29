'use client';

/**
 * AgentOS Ops Console - Pack Card Component
 * Individual pack card for grid and list views
 */

import React from 'react';
import Link from 'next/link';
import {
  Package,
  Bot,
  Download,
  Star,
  ExternalLink,
  Clock,
  User,
  Tag,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { cn, formatRelativeTime, formatCompactNumber, snakeToTitle } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type {
  Pack,
  PackCategory,
  PackLifecycle,
} from '@/app/studio/packs/page';

// ============================================
// Types
// ============================================

interface PackCardProps {
  pack: Pack;
  viewMode: 'grid' | 'list';
  isInstalled?: boolean;
  isInstalling?: boolean;
  isUninstalling?: boolean;
  onInstall?: (packId: string) => void;
  onUninstall?: (packId: string) => void;
}

// ============================================
// Helper Functions
// ============================================

function getCategoryBadgeVariant(
  category: PackCategory
): 'success' | 'warning' | 'secondary' {
  switch (category) {
    case 'production':
      return 'success';
    case 'beta':
      return 'warning';
    case 'alpha':
      return 'secondary';
    default:
      return 'secondary';
  }
}

function getLifecycleBadgeVariant(
  lifecycle: PackLifecycle
): 'success' | 'warning' | 'error' | 'info' {
  switch (lifecycle) {
    case 'stable':
      return 'success';
    case 'maintenance':
      return 'warning';
    case 'deprecated':
      return 'error';
    case 'experimental':
      return 'info';
    default:
      return 'info';
  }
}

function getPackIcon(packSlug: string): React.ReactNode {
  // Return appropriate icon based on pack type
  const iconClass = 'w-6 h-6';
  return <Package className={iconClass} />;
}

function getPackColor(packSlug: string): string {
  const colors: Record<string, string> = {
    product: 'from-blue-500 to-indigo-600',
    marketing: 'from-pink-500 to-rose-600',
    supabase: 'from-emerald-500 to-teal-600',
    engineering: 'from-violet-500 to-purple-600',
    design: 'from-fuchsia-500 to-pink-600',
    devops: 'from-orange-500 to-amber-600',
    qa: 'from-cyan-500 to-blue-600',
    legal: 'from-slate-500 to-gray-600',
    mobile: 'from-green-500 to-emerald-600',
    research: 'from-indigo-500 to-blue-600',
    planning: 'from-amber-500 to-yellow-600',
    analytics: 'from-sky-500 to-cyan-600',
    orchestration: 'from-purple-500 to-violet-600',
    error_predictor: 'from-red-500 to-orange-600',
    finance: 'from-emerald-500 to-green-600',
    lead_faucet: 'from-rose-500 to-pink-600',
  };

  return colors[packSlug] || 'from-slate-500 to-gray-600';
}

// ============================================
// Pack Card Component - Grid View
// ============================================

interface PackCardGridProps {
  pack: Pack;
  isInstalled?: boolean;
  isInstalling?: boolean;
  isUninstalling?: boolean;
  onInstall?: (packId: string) => void;
  onUninstall?: (packId: string) => void;
}

function PackCardGrid({
  pack,
  isInstalled = false,
  isInstalling = false,
  isUninstalling = false,
  onInstall,
  onUninstall,
}: PackCardGridProps) {
  const isLoading = isInstalling || isUninstalling;

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading && onInstall) {
      onInstall(pack.id);
    }
  };

  const handleUninstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading && onUninstall) {
      onUninstall(pack.id);
    }
  };

  return (
    <Card className="card-hover group">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105',
                getPackColor(pack.slug)
              )}
            >
              {getPackIcon(pack.slug)}
            </div>
            <div>
              <Link
                href={`/studio/packs/${pack.slug}`}
                className="text-lg font-semibold text-slate-900 dark:text-dark-text-primary hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                {pack.name}
              </Link>
              <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                v{pack.version}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isInstalled && (
              <Badge variant="success" size="sm" dot dotColor="success">
                Installed
              </Badge>
            )}
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
                {pack.popularity}
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge
            variant={getCategoryBadgeVariant(pack.category)}
            size="sm"
          >
            {pack.category}
          </Badge>
          <Badge
            variant={getLifecycleBadgeVariant(pack.lifecycle)}
            size="sm"
          >
            {pack.lifecycle}
          </Badge>
          <Badge variant="outline" size="sm">
            {snakeToTitle(pack.domain)}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 dark:text-dark-text-secondary line-clamp-2 mb-4">
          {pack.description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Bot className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 dark:text-dark-text-secondary">
              {pack.agentCount} agents
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Download className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 dark:text-dark-text-secondary">
              {formatCompactNumber(pack.downloads)}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {pack.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-dark-bg-tertiary text-slate-600 dark:text-dark-text-tertiary"
            >
              {tag}
            </span>
          ))}
          {pack.tags.length > 3 && (
            <span className="text-xs text-slate-400 dark:text-dark-text-muted">
              +{pack.tags.length - 3} more
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-dark-border-primary flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-dark-text-muted">
            <User className="w-3.5 h-3.5" />
            <span>{pack.author}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-dark-text-muted">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatRelativeTime(pack.updatedAt)}</span>
          </div>
        </div>

        {/* Hover Actions */}
        <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {isInstalled ? (
            <Button
              variant="outline"
              fullWidth
              size="sm"
              onClick={handleUninstallClick}
              disabled={isLoading}
            >
              {isUninstalling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Uninstall
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              fullWidth
              size="sm"
              onClick={handleInstallClick}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Install
                </>
              )}
            </Button>
          )}
          <Link href={`/studio/packs/${pack.slug}`} className="flex-shrink-0">
            <Button variant="ghost" size="sm" title="View pack details">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Pack Card Component - List View
// ============================================

interface PackCardListProps {
  pack: Pack;
  isInstalled?: boolean;
  isInstalling?: boolean;
  isUninstalling?: boolean;
  onInstall?: (packId: string) => void;
  onUninstall?: (packId: string) => void;
}

function PackCardList({
  pack,
  isInstalled = false,
  isInstalling = false,
  isUninstalling = false,
  onInstall,
  onUninstall,
}: PackCardListProps) {
  const isLoading = isInstalling || isUninstalling;

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading && onInstall) {
      onInstall(pack.id);
    }
  };

  const handleUninstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading && onUninstall) {
      onUninstall(pack.id);
    }
  };

  return (
    <Card className="card-hover group">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div
            className={cn(
              'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg flex-shrink-0 transition-transform group-hover:scale-105',
              getPackColor(pack.slug)
            )}
          >
            {getPackIcon(pack.slug)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <Link
                href={`/studio/packs/${pack.slug}`}
                className="font-semibold text-slate-900 dark:text-dark-text-primary hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                {pack.name}
              </Link>
              <span className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                v{pack.version}
              </span>
              <Badge
                variant={getCategoryBadgeVariant(pack.category)}
                size="sm"
              >
                {pack.category}
              </Badge>
              <Badge
                variant={getLifecycleBadgeVariant(pack.lifecycle)}
                size="sm"
              >
                {pack.lifecycle}
              </Badge>
              {isInstalled && (
                <Badge variant="success" size="sm" dot dotColor="success">
                  Installed
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-dark-text-secondary line-clamp-1">
              {pack.description}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-sm" title="Agents">
              <Bot className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 dark:text-dark-text-secondary">
                {pack.agentCount}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm" title="Downloads">
              <Download className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 dark:text-dark-text-secondary">
                {formatCompactNumber(pack.downloads)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm" title="Popularity">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-medium text-slate-700 dark:text-dark-text-secondary">
                {pack.popularity}
              </span>
            </div>
          </div>

          {/* Author & Time */}
          <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-dark-text-muted flex-shrink-0 min-w-[140px]">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>{pack.author}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatRelativeTime(pack.updatedAt)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isInstalled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUninstallClick}
                disabled={isLoading}
                className="min-w-[100px]"
              >
                {isUninstalling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Uninstall
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleInstallClick}
                disabled={isLoading}
                className="min-w-[100px] bg-purple-600 hover:bg-purple-700"
              >
                {isInstalling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Installing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Install
                  </>
                )}
              </Button>
            )}
            <Link href={`/studio/packs/${pack.slug}`}>
              <Button variant="ghost" size="sm" title="View pack details">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Pack Card Component - Main Export
// ============================================

export function PackCard({
  pack,
  viewMode,
  isInstalled,
  isInstalling,
  isUninstalling,
  onInstall,
  onUninstall,
}: PackCardProps) {
  if (viewMode === 'grid') {
    return (
      <PackCardGrid
        pack={pack}
        isInstalled={isInstalled}
        isInstalling={isInstalling}
        isUninstalling={isUninstalling}
        onInstall={onInstall}
        onUninstall={onUninstall}
      />
    );
  }
  return (
    <PackCardList
      pack={pack}
      isInstalled={isInstalled}
      isInstalling={isInstalling}
      isUninstalling={isUninstalling}
      onInstall={onInstall}
      onUninstall={onUninstall}
    />
  );
}

export default PackCard;
