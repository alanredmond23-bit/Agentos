/**
 * AgentOS Studio - Editor Settings Component
 * Dropdown component for configuring Monaco editor settings
 * Features: Font size, tab size, word wrap, minimap, theme, keybindings
 */

'use client';

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  Settings2,
  Type,
  IndentIncrease,
  WrapText,
  Map,
  MapOff,
  Moon,
  Sun,
  Palette,
  Keyboard,
  RotateCcw,
  ChevronRight,
  Check,
  Monitor,
  Maximize2,
  Eye,
  EyeOff,
  Hash,
  AlignLeft
} from 'lucide-react';

import { IconButton } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface EditorSettings {
  fontSize: number;
  tabSize: 2 | 4 | 8;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  minimap: boolean;
  theme: 'light' | 'dark' | 'system';
  lineNumbers: 'on' | 'off' | 'relative';
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  smoothScrolling: boolean;
  bracketPairColorization: boolean;
  stickyScroll: boolean;
}

export interface EditorSettingsProps {
  settings: EditorSettings;
  onSettingsChange: (settings: Partial<EditorSettings>) => void;
  onReset?: () => void;
  className?: string;
}

// ============================================
// Default Settings
// ============================================

export const defaultEditorSettings: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  minimap: true,
  theme: 'system',
  lineNumbers: 'on',
  renderWhitespace: 'selection',
  cursorBlinking: 'smooth',
  smoothScrolling: true,
  bracketPairColorization: true,
  stickyScroll: true
};

// ============================================
// Settings Section Component
// ============================================

interface SettingsSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SettingsSection = memo(function SettingsSection({
  title,
  icon,
  children
}: SettingsSectionProps) {
  return (
    <div className="py-2">
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-dark-text-tertiary uppercase tracking-wider">
        {icon}
        {title}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
});

// ============================================
// Toggle Setting Component
// ============================================

interface ToggleSettingProps {
  label: string;
  description?: string;
  icon: React.ReactNode;
  value: boolean;
  onChange: (value: boolean) => void;
}

const ToggleSetting = memo(function ToggleSetting({
  label,
  description,
  icon,
  value,
  onChange
}: ToggleSettingProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2.5',
        'text-sm text-slate-700 dark:text-dark-text-secondary',
        'hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary',
        'transition-colors'
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-slate-400 dark:text-dark-text-tertiary">{icon}</span>
        <div className="text-left">
          <div className="font-medium">{label}</div>
          {description && (
            <div className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-0.5">
              {description}
            </div>
          )}
        </div>
      </div>
      <span
        className={cn(
          'w-9 h-5 rounded-full transition-colors relative flex-shrink-0',
          value ? 'bg-brand-500' : 'bg-slate-200 dark:bg-dark-bg-tertiary'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
            value ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </span>
    </button>
  );
});

// ============================================
// Select Setting Component
// ============================================

interface SelectSettingProps<T extends string | number> {
  label: string;
  icon: React.ReactNode;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

function SelectSetting<T extends string | number>({
  label,
  icon,
  value,
  options,
  onChange
}: SelectSettingProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5',
          'text-sm text-slate-700 dark:text-dark-text-secondary',
          'hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary',
          'transition-colors'
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-slate-400 dark:text-dark-text-tertiary">{icon}</span>
          <span className="font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-dark-text-tertiary">
            {selectedOption?.label}
          </span>
          <ChevronRight
            className={cn(
              'w-4 h-4 text-slate-400 transition-transform',
              isOpen && 'rotate-90'
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute right-0 top-full mt-1 w-48 z-50',
            'bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl',
            'border border-slate-200 dark:border-dark-border-primary',
            'py-1 animate-in fade-in slide-in-from-top-2 duration-150'
          )}
        >
          {options.map((option) => (
            <button
              key={String(option.value)}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2',
                'text-sm transition-colors',
                value === option.value
                  ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                  : 'text-slate-700 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary'
              )}
            >
              <span>{option.label}</span>
              {value === option.value && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Slider Setting Component
// ============================================

interface SliderSettingProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

const SliderSetting = memo(function SliderSetting({
  label,
  icon,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}: SliderSettingProps) {
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 dark:text-dark-text-tertiary">{icon}</span>
          <span className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
            {label}
          </span>
        </div>
        <span className="text-xs font-mono text-slate-500 dark:text-dark-text-tertiary bg-slate-100 dark:bg-dark-bg-tertiary px-2 py-0.5 rounded">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          'w-full h-2 rounded-full appearance-none cursor-pointer',
          'bg-slate-200 dark:bg-dark-bg-tertiary',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-brand-500',
          '[&::-webkit-slider-thumb]:shadow-md',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-webkit-slider-thumb]:transition-transform',
          '[&::-webkit-slider-thumb]:hover:scale-110',
          '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4',
          '[&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:bg-brand-500',
          '[&::-moz-range-thumb]:border-0',
          '[&::-moz-range-thumb]:cursor-pointer'
        )}
      />
      <div className="flex justify-between text-[10px] text-slate-400 dark:text-dark-text-tertiary mt-1">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
});

// ============================================
// Main Editor Settings Component
// ============================================

export const EditorSettings = memo(function EditorSettings({
  settings,
  onSettingsChange,
  onReset,
  className
}: EditorSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <Tooltip content="Editor Settings">
        <IconButton
          variant="ghost"
          size="sm"
          icon={<Settings2 className="w-4 h-4" />}
          aria-label="Editor settings"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        />
      </Tooltip>

      {isOpen && (
        <>
          <div
            className={cn(
              'absolute right-0 top-full mt-1 w-72 z-50',
              'bg-white dark:bg-dark-bg-secondary rounded-xl shadow-2xl',
              'border border-slate-200 dark:border-dark-border-primary',
              'overflow-hidden',
              'animate-in fade-in slide-in-from-top-2 duration-200'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
                Editor Settings
              </h3>
              {onReset && (
                <button
                  onClick={onReset}
                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-dark-text-tertiary hover:text-slate-700 dark:hover:text-dark-text-secondary transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            {/* Settings Content */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto divide-y divide-slate-100 dark:divide-dark-border-primary">
              {/* Appearance Section */}
              <SettingsSection title="Appearance" icon={<Palette className="w-3.5 h-3.5" />}>
                <SelectSetting
                  label="Theme"
                  icon={settings.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  value={settings.theme}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'system', label: 'System' }
                  ]}
                  onChange={(value) => onSettingsChange({ theme: value as EditorSettings['theme'] })}
                />
                <SliderSetting
                  label="Font Size"
                  icon={<Type className="w-4 h-4" />}
                  value={settings.fontSize}
                  min={10}
                  max={24}
                  unit="px"
                  onChange={(value) => onSettingsChange({ fontSize: value })}
                />
                <ToggleSetting
                  label="Minimap"
                  description="Show code overview on the right"
                  icon={settings.minimap ? <Map className="w-4 h-4" /> : <MapOff className="w-4 h-4" />}
                  value={settings.minimap}
                  onChange={(value) => onSettingsChange({ minimap: value })}
                />
              </SettingsSection>

              {/* Editor Section */}
              <SettingsSection title="Editor" icon={<AlignLeft className="w-3.5 h-3.5" />}>
                <SelectSetting
                  label="Tab Size"
                  icon={<IndentIncrease className="w-4 h-4" />}
                  value={settings.tabSize}
                  options={[
                    { value: 2, label: '2 spaces' },
                    { value: 4, label: '4 spaces' },
                    { value: 8, label: '8 spaces' }
                  ]}
                  onChange={(value) => onSettingsChange({ tabSize: value as EditorSettings['tabSize'] })}
                />
                <SelectSetting
                  label="Word Wrap"
                  icon={<WrapText className="w-4 h-4" />}
                  value={settings.wordWrap}
                  options={[
                    { value: 'on', label: 'On' },
                    { value: 'off', label: 'Off' },
                    { value: 'wordWrapColumn', label: 'At Column' },
                    { value: 'bounded', label: 'Bounded' }
                  ]}
                  onChange={(value) => onSettingsChange({ wordWrap: value as EditorSettings['wordWrap'] })}
                />
                <SelectSetting
                  label="Line Numbers"
                  icon={<Hash className="w-4 h-4" />}
                  value={settings.lineNumbers}
                  options={[
                    { value: 'on', label: 'On' },
                    { value: 'off', label: 'Off' },
                    { value: 'relative', label: 'Relative' }
                  ]}
                  onChange={(value) => onSettingsChange({ lineNumbers: value as EditorSettings['lineNumbers'] })}
                />
                <SelectSetting
                  label="Whitespace"
                  icon={<Eye className="w-4 h-4" />}
                  value={settings.renderWhitespace}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'boundary', label: 'Boundary' },
                    { value: 'selection', label: 'Selection' },
                    { value: 'trailing', label: 'Trailing' },
                    { value: 'all', label: 'All' }
                  ]}
                  onChange={(value) => onSettingsChange({ renderWhitespace: value as EditorSettings['renderWhitespace'] })}
                />
              </SettingsSection>

              {/* Behavior Section */}
              <SettingsSection title="Behavior" icon={<Keyboard className="w-3.5 h-3.5" />}>
                <ToggleSetting
                  label="Smooth Scrolling"
                  icon={<Monitor className="w-4 h-4" />}
                  value={settings.smoothScrolling}
                  onChange={(value) => onSettingsChange({ smoothScrolling: value })}
                />
                <ToggleSetting
                  label="Bracket Colorization"
                  description="Color matching bracket pairs"
                  icon={<Palette className="w-4 h-4" />}
                  value={settings.bracketPairColorization}
                  onChange={(value) => onSettingsChange({ bracketPairColorization: value })}
                />
                <ToggleSetting
                  label="Sticky Scroll"
                  description="Keep scope headers visible"
                  icon={<Maximize2 className="w-4 h-4" />}
                  value={settings.stickyScroll}
                  onChange={(value) => onSettingsChange({ stickyScroll: value })}
                />
                <SelectSetting
                  label="Cursor Blinking"
                  icon={<Type className="w-4 h-4" />}
                  value={settings.cursorBlinking}
                  options={[
                    { value: 'blink', label: 'Blink' },
                    { value: 'smooth', label: 'Smooth' },
                    { value: 'phase', label: 'Phase' },
                    { value: 'expand', label: 'Expand' },
                    { value: 'solid', label: 'Solid' }
                  ]}
                  onChange={(value) => onSettingsChange({ cursorBlinking: value as EditorSettings['cursorBlinking'] })}
                />
              </SettingsSection>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-200 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary">
              <p className="text-[10px] text-slate-400 dark:text-dark-text-tertiary text-center">
                Settings are saved automatically
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default EditorSettings;
