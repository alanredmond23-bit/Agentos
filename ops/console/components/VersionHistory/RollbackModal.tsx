/**
 * AgentOS Studio - Rollback Modal Component
 * Confirmation modal for rolling back to a previous version
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, RotateCcw, X, Clock, User, ArrowRight } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatVersionNumber, type Version } from '@/lib/studio/versionControl';

// ============================================
// Types
// ============================================

interface RollbackModalProps {
  isOpen: boolean;
  version: Version | null;
  currentVersion: Version | null;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// ============================================
// Rollback Modal Component
// ============================================

export function RollbackModal({
  isOpen,
  version,
  currentVersion,
  isLoading,
  onConfirm,
  onCancel,
}: RollbackModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onCancel]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        isOpen &&
        !isLoading
      ) {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isLoading, onCancel]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !version) return null;

  const targetVersionLabel = formatVersionNumber(version.version);
  const currentVersionLabel = currentVersion
    ? formatVersionNumber(currentVersion.version)
    : 'unknown';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full max-w-md mx-4 bg-white dark:bg-dark-bg-secondary rounded-xl shadow-2xl',
          'transform transition-all duration-200',
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-dark-text-primary">
                Confirm Rollback
              </h2>
              <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                This action will create a new version
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="!p-1"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Version Transition */}
          <div className="flex items-center justify-center gap-4 py-4 px-6 bg-slate-50 dark:bg-dark-bg-tertiary rounded-lg">
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mb-1">
                Current
              </p>
              <Badge variant="default" size="lg">
                {currentVersionLabel}
              </Badge>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400" />
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mb-1">
                Rollback to
              </p>
              <Badge variant="warning" size="lg">
                {targetVersionLabel}
              </Badge>
            </div>
          </div>

          {/* Version Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-700 dark:text-dark-text-primary">
              Target Version Details
            </h3>

            <div className="p-3 border border-slate-200 dark:border-dark-border-primary rounded-lg space-y-2">
              {/* Message */}
              <p className="text-sm text-slate-700 dark:text-dark-text-primary">
                {version.message}
              </p>

              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-dark-text-tertiary">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{version.author.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTime(version.timestamp)}</span>
                </div>
              </div>

              {/* Tags */}
              {version.tags && version.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {version.tags.map(tag => (
                    <Badge key={tag} variant="outline" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-medium mb-1">Important</p>
              <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-400">
                <li>A new version will be created with this configuration</li>
                <li>Any unsaved changes will be lost</li>
                <li>This action can be undone by rolling back again</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary rounded-b-xl">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={isLoading}
            loadingText="Rolling back..."
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Rollback to {targetVersionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default RollbackModal;
