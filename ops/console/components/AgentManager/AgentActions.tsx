/**
 * AgentOS Studio - Agent Actions Component
 * Dropdown menu with row-level actions for agents
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { AgentPack } from '@/types';
import {
  MoreVertical,
  Edit,
  Copy,
  Download,
  Power,
  PowerOff,
  Trash2,
  ExternalLink,
  History,
  Settings,
  Play,
  FileCode
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type AuthorityLevel = 'operator' | 'manager' | 'worker' | 'observer';

export interface StudioAgent {
  id: string;
  name: string;
  role: string;
  pack: AgentPack;
  authority: AuthorityLevel;
  status: 'active' | 'inactive';
  lastModified: string;
  version: string;
  description: string;
  capabilities: string[];
  createdAt: string;
  executionCount: number;
}

interface AgentActionsProps {
  agent: StudioAgent;
  onAction: (action: string) => void;
}

// ============================================
// Action Item Types
// ============================================

interface ActionItem {
  id: string;
  label: string;
  icon: React.ElementType;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  divider?: boolean;
}

// ============================================
// Component
// ============================================

export function AgentActions({ agent, onAction }: AgentActionsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Build action items based on agent state
  const actions: ActionItem[] = [
    {
      id: 'edit',
      label: 'Edit Agent',
      icon: Edit
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy
    },
    {
      id: 'export-yaml',
      label: 'Export YAML',
      icon: FileCode
    },
    {
      id: 'export-json',
      label: 'Export JSON',
      icon: Download,
      divider: true
    },
    {
      id: 'run',
      label: 'Run Agent',
      icon: Play,
      disabled: agent.status === 'inactive'
    },
    {
      id: 'configure',
      label: 'Configure',
      icon: Settings
    },
    {
      id: 'history',
      label: 'View History',
      icon: History,
      divider: true
    },
    {
      id: 'open-studio',
      label: 'Open in Studio',
      icon: ExternalLink,
      divider: true
    },
    ...(agent.status === 'active'
      ? [{
          id: 'disable',
          label: 'Disable Agent',
          icon: PowerOff,
          variant: 'danger' as const
        }]
      : [{
          id: 'enable',
          label: 'Enable Agent',
          icon: Power
        }]
    ),
    {
      id: 'delete',
      label: 'Delete Agent',
      icon: Trash2,
      variant: 'danger'
    }
  ];

  const handleAction = (actionId: string) => {
    setIsOpen(false);

    // Handle navigation actions
    switch (actionId) {
      case 'edit':
        router.push(`/studio/agents/${agent.id}`);
        return;
      case 'export-yaml':
        router.push(`/studio/agents/${agent.id}/yaml`);
        return;
      case 'history':
        router.push(`/studio/agents/${agent.id}/history`);
        return;
      case 'open-studio':
        router.push(`/studio/agents/${agent.id}`);
        return;
      default:
        // For other actions, call the parent handler
        onAction(actionId);
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-1.5 rounded-lg transition-colors',
          'text-slate-400 hover:text-slate-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary',
          'hover:bg-slate-100 dark:hover:bg-dark-bg-elevated',
          isOpen && 'bg-slate-100 dark:bg-dark-bg-elevated text-slate-600 dark:text-dark-text-secondary'
        )}
        aria-label="Agent actions"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute z-50 right-0 mt-1 w-48',
            'bg-white dark:bg-dark-bg-secondary',
            'rounded-lg shadow-lg dark:shadow-xl dark:shadow-black/30',
            'border border-slate-200 dark:border-dark-border-primary',
            'py-1 overflow-hidden',
            'animate-in fade-in-0 zoom-in-95 duration-150'
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {actions.map((action, index) => {
            const Icon = action.icon;
            const showDivider = action.divider && index < actions.length - 1;

            return (
              <React.Fragment key={action.id}>
                <button
                  onClick={() => !action.disabled && handleAction(action.id)}
                  disabled={action.disabled}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors',
                    action.disabled
                      ? 'text-slate-300 dark:text-dark-text-muted cursor-not-allowed'
                      : action.variant === 'danger'
                        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                        : 'text-slate-700 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary'
                  )}
                  role="menuitem"
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 flex-shrink-0',
                      action.disabled && 'opacity-50'
                    )}
                  />
                  <span className="truncate">{action.label}</span>
                </button>

                {showDivider && (
                  <div className="h-px bg-slate-200 dark:bg-dark-border-primary my-1" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AgentActions;
