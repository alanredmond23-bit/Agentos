/**
 * AgentOS Studio - Bulk Actions Component
 * Toolbar appearing when items are selected for bulk operations
 */

'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
  CheckSquare,
  X,
  Power,
  PowerOff,
  Trash2,
  Download,
  FileCode,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onEnable: () => void;
  onDisable: () => void;
  onDelete: () => void;
  onExport: (format: 'json' | 'yaml') => void;
  onClearSelection: () => void;
  onSelectAll: () => void;
  className?: string;
}

// ============================================
// Export Dropdown Component
// ============================================

interface ExportDropdownProps {
  onExport: (format: 'json' | 'yaml') => void;
}

function ExportDropdown({ onExport }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        rightIcon={<ChevronDown className="w-3 h-3" />}
        leftIcon={<Download className="w-3.5 h-3.5" />}
      >
        Export
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            className={cn(
              'absolute left-0 top-full mt-1 w-40 z-50',
              'bg-white dark:bg-dark-bg-secondary',
              'rounded-lg shadow-lg dark:shadow-xl dark:shadow-black/30',
              'border border-slate-200 dark:border-dark-border-primary',
              'py-1 overflow-hidden',
              'animate-in fade-in-0 zoom-in-95 duration-150'
            )}
          >
            <button
              onClick={() => {
                onExport('json');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary transition-colors"
            >
              <Download className="w-4 h-4" />
              Export as JSON
            </button>
            <button
              onClick={() => {
                onExport('yaml');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary transition-colors"
            >
              <FileCode className="w-4 h-4" />
              Export as YAML
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Delete Confirmation Modal
// ============================================

interface DeleteConfirmationProps {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmation({ count, onConfirm, onCancel }: DeleteConfirmationProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className={cn(
          'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-full max-w-md',
          'bg-white dark:bg-dark-bg-elevated',
          'rounded-2xl shadow-2xl',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
      >
        <div className="p-6">
          {/* Warning Icon */}
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>

          {/* Content */}
          <h3 className="text-lg font-semibold text-slate-900 dark:text-dark-text-primary text-center mb-2">
            Delete {count} Agent{count > 1 ? 's' : ''}?
          </h3>
          <p className="text-sm text-slate-500 dark:text-dark-text-tertiary text-center mb-6">
            This action cannot be undone. The selected agent{count > 1 ? 's' : ''} will be permanently removed from the system.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={onConfirm}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Delete {count > 1 ? `${count} Agents` : 'Agent'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================
// Main Component
// ============================================

export function BulkActions({
  selectedCount,
  totalCount,
  onEnable,
  onDisable,
  onDelete,
  onExport,
  onClearSelection,
  onSelectAll,
  className
}: BulkActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const allSelected = selectedCount === totalCount;

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-4 p-3',
          'bg-purple-50 dark:bg-purple-500/10',
          'rounded-lg border border-purple-200 dark:border-purple-500/20',
          'animate-in slide-in-from-top-2 fade-in-0 duration-200',
          className
        )}
      >
        {/* Selection Info */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20">
            <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
              {selectedCount} selected
            </span>
            {!allSelected && (
              <button
                onClick={onSelectAll}
                className="ml-2 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 underline underline-offset-2"
              >
                Select all {totalCount}
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-purple-200 dark:bg-purple-500/30" />

        {/* Bulk Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={onEnable}
            leftIcon={<Power className="w-3.5 h-3.5" />}
            className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
          >
            Enable
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onDisable}
            leftIcon={<PowerOff className="w-3.5 h-3.5" />}
            className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
          >
            Disable
          </Button>

          <ExportDropdown onExport={onExport} />

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDeleteClick}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            Delete
          </Button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Clear Selection */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          leftIcon={<X className="w-3.5 h-3.5" />}
          className="text-slate-500 dark:text-dark-text-tertiary"
        >
          Clear Selection
        </Button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmation
          count={selectedCount}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </>
  );
}

export default BulkActions;
