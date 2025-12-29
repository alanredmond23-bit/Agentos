/**
 * AgentOS Ops Console - Graph Controls Component
 * Zoom, pan, fit, layout (Auto/Horizontal/Vertical), and export controls
 */

'use client';

import React from 'react';
import { useReactFlow, Panel } from 'reactflow';
import { cn } from '@/lib/utils';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Image,
  FileCode,
  Layers,
  ArrowRight,
  ArrowDown,
  AlertTriangle,
  LayoutGrid,
} from 'lucide-react';
import type { LayoutType } from './DependencyGraph';

// ============================================
// Types
// ============================================

interface GraphControlsProps {
  layout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  highlightConflicts: boolean;
  onHighlightConflictsChange: (highlight: boolean) => void;
  onExport: (format: 'png' | 'svg') => void;
}

// ============================================
// Control Button Component
// ============================================

interface ControlButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

const ControlButton: React.FC<ControlButtonProps> = ({
  onClick,
  icon,
  label,
  active = false,
  disabled = false,
  variant = 'default',
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200',
      active
        ? variant === 'danger'
          ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
          : 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
        : 'bg-white dark:bg-dark-bg-secondary text-slate-600 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary',
      disabled && 'opacity-50 cursor-not-allowed',
      'border border-slate-200 dark:border-dark-border-primary',
      'shadow-sm hover:shadow'
    )}
    title={label}
    aria-label={label}
  >
    {icon}
  </button>
);

// ============================================
// Layout Selector Component
// ============================================

interface LayoutSelectorProps {
  layout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
}

const LayoutSelector: React.FC<LayoutSelectorProps> = ({ layout, onLayoutChange }) => {
  const layouts: Array<{ value: LayoutType; label: string; icon: React.ReactNode }> = [
    { value: 'auto', label: 'Auto (Dagre)', icon: <LayoutGrid className="w-4 h-4" /> },
    { value: 'horizontal', label: 'Horizontal', icon: <ArrowRight className="w-4 h-4" /> },
    { value: 'vertical', label: 'Vertical', icon: <ArrowDown className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col gap-1 p-1 bg-white/95 dark:bg-dark-bg-secondary/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 dark:border-dark-border-primary">
      <div className="px-2 py-1">
        <span className="text-[10px] font-semibold text-slate-400 dark:text-dark-text-tertiary uppercase tracking-wider">
          Layout
        </span>
      </div>
      {layouts.map((l) => (
        <button
          key={l.value}
          onClick={() => onLayoutChange(l.value)}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200 text-left',
            layout === l.value
              ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
              : 'text-slate-600 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary'
          )}
        >
          <span className={cn(
            'flex items-center justify-center w-6 h-6 rounded-md',
            layout === l.value
              ? 'bg-purple-200 dark:bg-purple-500/30'
              : 'bg-slate-100 dark:bg-dark-bg-tertiary'
          )}>
            {l.icon}
          </span>
          <span className="text-xs font-medium">{l.label}</span>
        </button>
      ))}
    </div>
  );
};

// ============================================
// Export Menu Component
// ============================================

interface ExportMenuProps {
  onExport: (format: 'png' | 'svg') => void;
  isOpen: boolean;
  onClose: () => void;
}

const ExportMenu: React.FC<ExportMenuProps> = ({ onExport, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div className="absolute bottom-full left-0 mb-2 z-50 bg-white dark:bg-dark-bg-secondary rounded-xl shadow-xl border border-slate-200 dark:border-dark-border-primary overflow-hidden min-w-[160px]">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-dark-border-secondary">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-dark-text-tertiary uppercase tracking-wider">
            Export Graph
          </span>
        </div>
        <div className="p-1">
          <button
            onClick={() => {
              onExport('png');
              onClose();
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors"
          >
            <Image className="w-4 h-4 text-slate-400" />
            <div className="text-left">
              <div className="font-medium">PNG Image</div>
              <div className="text-[10px] text-slate-400 dark:text-dark-text-tertiary">
                High resolution bitmap
              </div>
            </div>
          </button>
          <button
            onClick={() => {
              onExport('svg');
              onClose();
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors"
          >
            <FileCode className="w-4 h-4 text-slate-400" />
            <div className="text-left">
              <div className="font-medium">SVG Vector</div>
              <div className="text-[10px] text-slate-400 dark:text-dark-text-tertiary">
                Scalable for any size
              </div>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};

// ============================================
// Graph Controls Component
// ============================================

export function GraphControls({
  layout,
  onLayoutChange,
  highlightConflicts,
  onHighlightConflictsChange,
  onExport,
}: GraphControlsProps) {
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow();
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  const [zoomLevel, setZoomLevel] = React.useState(100);

  // Update zoom level display
  React.useEffect(() => {
    const interval = setInterval(() => {
      try {
        const currentZoom = getZoom();
        setZoomLevel(Math.round(currentZoom * 100));
      } catch {
        // Ignore errors when not mounted
      }
    }, 200);

    return () => clearInterval(interval);
  }, [getZoom]);

  const handleZoomIn = () => {
    zoomIn({ duration: 200 });
  };

  const handleZoomOut = () => {
    zoomOut({ duration: 200 });
  };

  const handleFitView = () => {
    fitView({ padding: 0.15, duration: 400 });
  };

  const handleExport = (format: 'png' | 'svg') => {
    // Call the global export function stored on window
    if (typeof window !== 'undefined' && (window as any).__exportGraph) {
      (window as any).__exportGraph(format);
    }
    onExport(format);
  };

  return (
    <Panel position="top-left" className="flex flex-col gap-3">
      {/* Zoom Controls */}
      <div className="flex flex-col gap-1 p-1.5 bg-white/95 dark:bg-dark-bg-secondary/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 dark:border-dark-border-primary">
        <ControlButton
          onClick={handleZoomIn}
          icon={<ZoomIn className="w-4 h-4" />}
          label="Zoom in"
        />

        {/* Zoom Level Indicator */}
        <div className="flex items-center justify-center h-6 text-[10px] font-medium text-slate-500 dark:text-dark-text-tertiary">
          {zoomLevel}%
        </div>

        <ControlButton
          onClick={handleZoomOut}
          icon={<ZoomOut className="w-4 h-4" />}
          label="Zoom out"
        />

        <div className="w-full h-px bg-slate-200 dark:bg-dark-border-primary my-0.5" />

        <ControlButton
          onClick={handleFitView}
          icon={<Maximize2 className="w-4 h-4" />}
          label="Fit to screen"
        />
      </div>

      {/* Layout Controls */}
      <LayoutSelector layout={layout} onLayoutChange={onLayoutChange} />

      {/* View Controls */}
      <div className="flex flex-col gap-1 p-1.5 bg-white/95 dark:bg-dark-bg-secondary/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 dark:border-dark-border-primary">
        <div className="px-1.5 py-1">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-dark-text-tertiary uppercase tracking-wider">
            Display
          </span>
        </div>
        <button
          onClick={() => onHighlightConflictsChange(!highlightConflicts)}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200 text-left',
            highlightConflicts
              ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
              : 'text-slate-600 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary'
          )}
        >
          <span className={cn(
            'flex items-center justify-center w-6 h-6 rounded-md',
            highlightConflicts
              ? 'bg-red-200 dark:bg-red-500/30'
              : 'bg-slate-100 dark:bg-dark-bg-tertiary'
          )}>
            <AlertTriangle className="w-3.5 h-3.5" />
          </span>
          <div>
            <span className="text-xs font-medium">Conflicts</span>
            <span className={cn(
              'ml-2 text-[9px] px-1.5 py-0.5 rounded-full',
              highlightConflicts
                ? 'bg-red-200 dark:bg-red-500/30 text-red-600 dark:text-red-300'
                : 'bg-slate-200 dark:bg-dark-bg-tertiary text-slate-500'
            )}>
              {highlightConflicts ? 'ON' : 'OFF'}
            </span>
          </div>
        </button>
      </div>

      {/* Export Controls */}
      <div className="relative flex flex-col gap-1 p-1.5 bg-white/95 dark:bg-dark-bg-secondary/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 dark:border-dark-border-primary">
        <ControlButton
          onClick={() => setExportMenuOpen(!exportMenuOpen)}
          icon={<Download className="w-4 h-4" />}
          label="Export graph"
          active={exportMenuOpen}
        />
        <ExportMenu
          onExport={handleExport}
          isOpen={exportMenuOpen}
          onClose={() => setExportMenuOpen(false)}
        />
      </div>
    </Panel>
  );
}

export default GraphControls;
