/**
 * AgentOS Ops Console - Tooltip Component
 * Informational tooltips and popovers
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Tooltip Types
// ============================================

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
}

// ============================================
// Tooltip Component
// ============================================

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  className,
  contentClassName,
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [coords, setCoords] = React.useState({ x: 0, y: 0 });
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  const showTooltip = React.useCallback(() => {
    if (disabled) return;

    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
          x: rect.left + rect.width / 2,
          y: position === 'top' ? rect.top : rect.bottom,
        });
      }
      setIsVisible(true);
    }, delay);
  }, [delay, disabled, position]);

  const hideTooltip = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionStyles: Record<TooltipPosition, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowStyles: Record<TooltipPosition, string> = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-slate-900 dark:border-t-zinc-800 border-x-transparent border-b-transparent',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-slate-900 dark:border-b-zinc-800 border-x-transparent border-t-transparent',
    left: 'right-0 top-1/2 -translate-y-1/2 translate-x-full border-l-slate-900 dark:border-l-zinc-800 border-y-transparent border-r-transparent',
    right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-r-slate-900 dark:border-r-zinc-800 border-y-transparent border-l-transparent',
  };

  return (
    <div
      ref={triggerRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}

      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            'absolute z-[var(--z-tooltip)] pointer-events-none',
            positionStyles[position],
            'animate-fade-in',
            contentClassName
          )}
        >
          <div className="tooltip relative whitespace-nowrap">
            {content}
            <span
              className={cn(
                'absolute w-0 h-0 border-4',
                arrowStyles[position]
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Info Tooltip Component
// ============================================

import { Info } from 'lucide-react';

interface InfoTooltipProps {
  content: React.ReactNode;
  position?: TooltipPosition;
  iconSize?: number;
  className?: string;
}

export function InfoTooltip({
  content,
  position = 'top',
  iconSize = 16,
  className,
}: InfoTooltipProps) {
  return (
    <Tooltip content={content} position={position}>
      <Info
        className={cn(
          'text-slate-400 dark:text-dark-text-muted hover:text-slate-600 dark:hover:text-dark-text-secondary cursor-help transition-colors',
          className
        )}
        style={{ width: iconSize, height: iconSize }}
      />
    </Tooltip>
  );
}

// ============================================
// Help Text Component
// ============================================

interface HelpTextProps {
  children: React.ReactNode;
  tooltip?: React.ReactNode;
  className?: string;
}

export function HelpText({ children, tooltip, className }: HelpTextProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="text-sm text-slate-500 dark:text-dark-text-tertiary">
        {children}
      </span>
      {tooltip && <InfoTooltip content={tooltip} />}
    </div>
  );
}

export default Tooltip;
