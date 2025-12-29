/**
 * AgentOS Ops Console - Pack Detail Component
 * Main component for displaying pack information with tabbed interface
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
  Clock,
} from 'lucide-react';
import { cn, formatRelativeTime, formatNumber } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PackOverview } from './PackOverview';
import { PackAgents } from './PackAgents';
import { PackDependencies } from './PackDependencies';
import { PackDocs } from './PackDocs';

// ============================================
// Type Definitions
// ============================================

export interface PackAgent {
  id: string;
  name: string;
  slug: string;
  role: string;
  description: string;
  authorityLevel: 'read' | 'write' | 'admin' | 'system';
  status: 'active' | 'paused' | 'stopped' | 'error';
  version: string;
  executionCount: number;
  successRate: number;
}

export interface PackDependency {
  id: string;
  name: string;
  version: string;
  type: 'required' | 'optional' | 'peer';
  installed: boolean;
  compatible: boolean;
  children?: PackDependency[];
}

export interface PackData {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  lifecycle: 'stable' | 'beta' | 'alpha' | 'deprecated';
  author: {
    name: string;
    email: string;
    avatar?: string;
  };
  repository?: string;
  homepage?: string;
  license: string;
  createdAt: string;
  updatedAt: string;
  installedAt?: string;
  totalAgents: number;
  activeAgents: number;
  totalExecutions: number;
  successRate: number;
  documentation?: string;
  agents: PackAgent[];
  dependencies: PackDependency[];
  tags: string[];
}

type TabId = 'overview' | 'agents' | 'dependencies' | 'docs';

interface TabConfig {
  id: TabId;
  label: string;
  count?: number;
}

interface PackDetailProps {
  pack: PackData;
}

// ============================================
// Lifecycle Badge Component
// ============================================

function LifecycleBadge({ lifecycle }: { lifecycle: PackData['lifecycle'] }) {
  const config: Record<
    PackData['lifecycle'],
    { variant: 'success' | 'warning' | 'info' | 'error'; label: string }
  > = {
    stable: { variant: 'success', label: 'Stable' },
    beta: { variant: 'info', label: 'Beta' },
    alpha: { variant: 'warning', label: 'Alpha' },
    deprecated: { variant: 'error', label: 'Deprecated' },
  };

  const { variant, label } = config[lifecycle];

  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
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
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
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
// Tab Navigation Component
// ============================================

interface TabNavigationProps {
  tabs: TabConfig[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="border-b border-slate-200 dark:border-dark-border-primary">
      <nav className="-mb-px flex space-x-8" aria-label="Pack sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.id
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
            )}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'ml-2 rounded-full py-0.5 px-2 text-xs',
                  activeTab === tab.id
                    ? 'bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-zinc-700 dark:text-zinc-300'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ============================================
// Pack Detail Component
// ============================================

export function PackDetail({ pack }: PackDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showMenu, setShowMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);

  const tabs: TabConfig[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'agents', label: 'Agents', count: pack.totalAgents },
    { id: 'dependencies', label: 'Dependencies', count: pack.dependencies.length },
    { id: 'docs', label: 'Documentation' },
  ];

  const handleUpdate = useCallback(async () => {
    setIsUpdating(true);
    try {
      // Simulate update process
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // In production, call API to update pack
      console.log('Pack updated successfully');
    } catch (error) {
      console.error('Failed to update pack:', error);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const handleUninstall = useCallback(async () => {
    if (!window.confirm(`Are you sure you want to uninstall ${pack.name}? This action cannot be undone.`)) {
      return;
    }

    setIsUninstalling(true);
    try {
      // Simulate uninstall process
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // In production, call API to uninstall pack
      router.push('/studio/packs');
    } catch (error) {
      console.error('Failed to uninstall pack:', error);
    } finally {
      setIsUninstalling(false);
    }
  }, [pack.name, router]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <PackOverview pack={pack} />;
      case 'agents':
        return <PackAgents agents={pack.agents} packSlug={pack.slug} />;
      case 'dependencies':
        return <PackDependencies dependencies={pack.dependencies} />;
      case 'docs':
        return <PackDocs documentation={pack.documentation} packName={pack.name} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Back Button */}
      <div className="flex items-center gap-3">
        <Link
          href="/studio/packs"
          className="p-2 text-slate-400 hover:text-slate-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary rounded-lg hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary transition-colors"
          aria-label="Back to packs"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <nav className="text-sm text-slate-500 dark:text-dark-text-tertiary">
          <Link href="/studio/packs" className="hover:text-brand-600 dark:hover:text-brand-400">
            Packs
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900 dark:text-dark-text-primary font-medium">
            {pack.name}
          </span>
        </nav>
      </div>

      {/* Pack Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Pack Info */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-dark-text-primary">
                    {pack.name}
                  </h1>
                  <LifecycleBadge lifecycle={pack.lifecycle} />
                  <Badge variant="outline" size="sm">
                    v{pack.version}
                  </Badge>
                </div>

                <p className="mt-2 text-slate-600 dark:text-dark-text-secondary max-w-2xl">
                  {pack.description}
                </p>

                {/* Tags */}
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

                {/* Quick Stats */}
                <div className="mt-4 flex flex-wrap items-center gap-6 text-sm">
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
                  {pack.installedAt && (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>Installed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {pack.installedAt ? (
                <>
                  <Button
                    variant="secondary"
                    leftIcon={<RefreshCw className={cn('w-4 h-4', isUpdating && 'animate-spin')} />}
                    onClick={handleUpdate}
                    loading={isUpdating}
                    loadingText="Updating..."
                  >
                    Check for Updates
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Install Pack
                </Button>
              )}

              <div className="relative">
                <IconButton
                  variant="secondary"
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
              This pack is no longer actively maintained. Consider migrating to an alternative solution.
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="min-h-[400px]">{renderTabContent()}</div>
    </div>
  );
}

export default PackDetail;
