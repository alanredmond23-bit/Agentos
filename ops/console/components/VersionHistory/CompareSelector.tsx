/**
 * AgentOS Studio - Compare Selector Component
 * Dropdown picker for selecting versions to compare
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, GitCompare, Calendar, User, X } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatVersionNumber, type Version } from '@/lib/studio/versionControl';

// ============================================
// Types
// ============================================

interface CompareSelectorProps {
  versions: Version[];
  selectedVersion: Version | null;
  compareVersion: Version | null;
  currentVersion: Version | null;
  onCompareSelect: (version: Version | null) => void;
  className?: string;
}

// ============================================
// Version Option Component
// ============================================

interface VersionOptionProps {
  version: Version;
  isSelected: boolean;
  isCurrent: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

function VersionOption({
  version,
  isSelected,
  isCurrent,
  isDisabled,
  onClick,
}: VersionOptionProps) {
  const formattedVersion = formatVersionNumber(version.version);
  const timestamp = formatRelativeTime(version.timestamp);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors',
        isSelected
          ? 'bg-brand-50 dark:bg-brand-500/10'
          : 'hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary',
        isDisabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Selection Indicator */}
      <div
        className={cn(
          'flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-colors',
          isSelected
            ? 'border-brand-600 bg-brand-600'
            : 'border-slate-300 dark:border-dark-border-primary'
        )}
      >
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </div>

      {/* Version Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-mono text-sm font-medium',
              isSelected
                ? 'text-brand-700 dark:text-brand-400'
                : 'text-slate-700 dark:text-dark-text-primary'
            )}
          >
            {formattedVersion}
          </span>
          {isCurrent && (
            <Badge variant="success" size="sm" dot dotColor="success">
              Current
            </Badge>
          )}
          {version.isDeployed && !isCurrent && (
            <Badge variant="info" size="sm">
              Deployed
            </Badge>
          )}
        </div>

        <p className="text-sm text-slate-600 dark:text-dark-text-secondary mt-0.5 line-clamp-1">
          {version.message}
        </p>

        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-dark-text-tertiary">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{version.author.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{timestamp}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ============================================
// Compare Selector Component
// ============================================

export function CompareSelector({
  versions,
  selectedVersion,
  compareVersion,
  currentVersion,
  onCompareSelect,
  className,
}: CompareSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter versions based on search
  const filteredVersions = versions.filter(version => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      version.message.toLowerCase().includes(query) ||
      version.author.name.toLowerCase().includes(query) ||
      formatVersionNumber(version.version).toLowerCase().includes(query) ||
      version.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // Exclude currently selected version from options
  const availableVersions = filteredVersions.filter(
    v => v.id !== selectedVersion?.id
  );

  const handleSelect = (version: Version) => {
    onCompareSelect(version);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onCompareSelect(null);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchQuery('');
    }
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      {compareVersion ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-lg">
            <GitCompare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
              Comparing with {formatVersionNumber(compareVersion.version)}
            </span>
            <button
              onClick={handleClear}
              className="ml-1 p-0.5 hover:bg-purple-200 dark:hover:bg-purple-500/20 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            rightIcon={<ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />}
          >
            Change
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          leftIcon={<GitCompare className="w-4 h-4" />}
          rightIcon={<ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />}
        >
          Compare with...
        </Button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2 w-96 max-h-96 bg-white dark:bg-dark-bg-secondary rounded-xl shadow-xl border border-slate-200 dark:border-dark-border-primary overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-200 dark:border-dark-border-primary">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search versions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-3 py-2 text-sm border border-slate-200 dark:border-dark-border-primary rounded-lg bg-white dark:bg-dark-bg-tertiary text-slate-900 dark:text-dark-text-primary placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Version List */}
          <div className="overflow-y-auto max-h-72">
            {availableVersions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                  {searchQuery ? 'No versions match your search' : 'No other versions available'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-dark-border-primary">
                {availableVersions.map(version => (
                  <VersionOption
                    key={version.id}
                    version={version}
                    isSelected={compareVersion?.id === version.id}
                    isCurrent={currentVersion?.id === version.id}
                    isDisabled={false}
                    onClick={() => handleSelect(version)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {currentVersion && currentVersion.id !== selectedVersion?.id && (
            <div className="p-2 border-t border-slate-200 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary">
              <button
                onClick={() => handleSelect(currentVersion)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated rounded-lg transition-colors"
              >
                <Badge variant="success" size="sm" dot dotColor="success">
                  Current
                </Badge>
                <span>Compare with current version</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CompareSelector;
