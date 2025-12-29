/**
 * AgentOS Studio - Live Preview Hook
 * React hook for managing live preview state with bidirectional sync
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  type AgentFormData,
  type SyncState,
  type ValidationResult,
  type ValidationError,
  type SyncConflict,
  FormYamlSyncManager,
  DEFAULT_FORM_DATA,
  formToYaml,
  yamlToForm,
  formToJson,
  validateFormData,
  validateYamlSyntax,
  detectConflicts,
} from '@/lib/studio/formYamlSync';

// ============================================
// Types
// ============================================

export interface UseLivePreviewOptions {
  /** Initial agent data to load */
  initialData?: Partial<AgentFormData>;
  /** Agent ID for fetching/saving */
  agentId?: string;
  /** Debounce delay for form changes (ms) */
  formDebounceMs?: number;
  /** Debounce delay for YAML changes (ms) */
  yamlDebounceMs?: number;
  /** Whether to enable auto-save drafts */
  autoSaveDrafts?: boolean;
  /** Draft save interval (ms) */
  draftSaveIntervalMs?: number;
  /** Callback when save is requested */
  onSave?: (data: AgentFormData, yaml: string) => Promise<void>;
  /** Callback when validation changes */
  onValidationChange?: (result: ValidationResult) => void;
  /** Callback when dirty state changes */
  onDirtyChange?: (isDirty: boolean) => void;
  /** Callback when conflicts are detected */
  onConflict?: (conflicts: SyncConflict[]) => void;
}

export interface UseLivePreviewReturn {
  // State
  state: SyncState;
  formData: AgentFormData;
  yamlContent: string;
  jsonOutput: string;
  validation: ValidationResult;

  // Status flags
  isLoading: boolean;
  isSyncing: boolean;
  isDirty: boolean;
  hasConflict: boolean;
  isValid: boolean;
  lastSource: 'form' | 'yaml' | 'none';
  lastSyncTime: number;

  // Actions
  updateForm: (updates: Partial<AgentFormData>) => void;
  updateField: <K extends keyof AgentFormData>(field: K, value: AgentFormData[K]) => void;
  updateNestedField: (path: string, value: unknown) => void;
  updateYaml: (yaml: string) => void;
  reset: (data?: AgentFormData) => void;
  reload: () => Promise<void>;
  save: () => Promise<boolean>;
  saveDraft: () => void;
  loadDraft: () => boolean;
  clearDraft: () => void;

  // Conflict resolution
  resolveConflict: (source: 'form' | 'yaml') => void;
  conflicts: SyncConflict[];

  // Validation helpers
  getFieldError: (path: string) => ValidationError | undefined;
  getFieldWarning: (path: string) => ValidationError | undefined;
  hasFieldError: (path: string) => boolean;
  triggerValidation: () => ValidationResult;

  // Utilities
  exportYaml: () => string;
  exportJson: () => string;
  importYaml: (yaml: string) => boolean;
  copyToClipboard: (format: 'yaml' | 'json') => Promise<boolean>;
}

// ============================================
// Constants
// ============================================

const DRAFT_STORAGE_KEY_PREFIX = 'agentos_studio_draft_';
const DEFAULT_FORM_DEBOUNCE_MS = 300;
const DEFAULT_YAML_DEBOUNCE_MS = 500;
const DEFAULT_DRAFT_SAVE_INTERVAL_MS = 30000; // 30 seconds

// ============================================
// useLivePreview Hook
// ============================================

export function useLivePreview(options: UseLivePreviewOptions = {}): UseLivePreviewReturn {
  const {
    initialData,
    agentId,
    formDebounceMs = DEFAULT_FORM_DEBOUNCE_MS,
    yamlDebounceMs = DEFAULT_YAML_DEBOUNCE_MS,
    autoSaveDrafts = true,
    draftSaveIntervalMs = DEFAULT_DRAFT_SAVE_INTERVAL_MS,
    onSave,
    onValidationChange,
    onDirtyChange,
    onConflict,
  } = options;

  // Sync manager reference
  const managerRef = useRef<FormYamlSyncManager | null>(null);

  // Local state
  const [state, setState] = useState<SyncState>(() => {
    const manager = new FormYamlSyncManager(initialData, formDebounceMs);
    managerRef.current = manager;
    return manager.getState();
  });

  const [isLoading, setIsLoading] = useState(false);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Draft storage key
  const draftKey = useMemo(() => {
    return agentId
      ? `${DRAFT_STORAGE_KEY_PREFIX}${agentId}`
      : `${DRAFT_STORAGE_KEY_PREFIX}new`;
  }, [agentId]);

  // Subscribe to sync manager updates
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    const unsubscribe = manager.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(state.isDirty);
  }, [state.isDirty, onDirtyChange]);

  // Notify parent of validation changes
  useEffect(() => {
    onValidationChange?.(state.validation);
  }, [state.validation, onValidationChange]);

  // Detect and notify conflicts
  useEffect(() => {
    if (state.hasConflict) {
      const detectedConflicts = detectConflicts(state.formData, state.yamlContent);
      setConflicts(detectedConflicts);
      onConflict?.(detectedConflicts);
    } else {
      setConflicts([]);
    }
  }, [state.hasConflict, state.formData, state.yamlContent, onConflict]);

  // Auto-save drafts
  useEffect(() => {
    if (!autoSaveDrafts || !state.isDirty) return;

    const intervalId = setInterval(() => {
      saveDraft();
    }, draftSaveIntervalMs);

    return () => clearInterval(intervalId);
  }, [autoSaveDrafts, state.isDirty, draftSaveIntervalMs]);

  // Load draft on mount (only once)
  useEffect(() => {
    if (!draftLoaded && autoSaveDrafts) {
      loadDraft();
      setDraftLoaded(true);
    }
  }, [draftLoaded, autoSaveDrafts]);

  // ============================================
  // Form Update Actions
  // ============================================

  const updateForm = useCallback((updates: Partial<AgentFormData>) => {
    managerRef.current?.updateForm(updates);
  }, []);

  const updateField = useCallback(<K extends keyof AgentFormData>(
    field: K,
    value: AgentFormData[K]
  ) => {
    managerRef.current?.updateForm({ [field]: value } as Partial<AgentFormData>);
  }, []);

  const updateNestedField = useCallback((path: string, value: unknown) => {
    const parts = path.split('.');
    const updates: Partial<AgentFormData> = {};

    if (parts.length === 1) {
      (updates as Record<string, unknown>)[parts[0]] = value;
    } else if (parts.length === 2) {
      const currentData = managerRef.current?.getState().formData || DEFAULT_FORM_DATA;
      const parentKey = parts[0] as keyof AgentFormData;
      const childKey = parts[1];

      if (typeof currentData[parentKey] === 'object' && currentData[parentKey] !== null) {
        (updates as Record<string, unknown>)[parentKey] = {
          ...(currentData[parentKey] as Record<string, unknown>),
          [childKey]: value,
        };
      }
    }

    if (Object.keys(updates).length > 0) {
      managerRef.current?.updateForm(updates);
    }
  }, []);

  // ============================================
  // YAML Update Actions
  // ============================================

  const updateYaml = useCallback((yaml: string) => {
    managerRef.current?.updateYaml(yaml);
  }, []);

  // ============================================
  // State Management Actions
  // ============================================

  const reset = useCallback((data?: AgentFormData) => {
    managerRef.current?.reset(data);
    clearDraft();
  }, []);

  const reload = useCallback(async () => {
    if (!agentId) return;

    setIsLoading(true);
    try {
      // In a real implementation, this would fetch from an API
      // For now, we just reset with initial data
      managerRef.current?.reset(initialData ? { ...DEFAULT_FORM_DATA, ...initialData } : undefined);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, initialData]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!onSave) return false;
    if (!state.validation.isValid) return false;

    setIsLoading(true);
    try {
      await onSave(state.formData, state.yamlContent);
      managerRef.current?.markClean();
      clearDraft();
      return true;
    } catch (error) {
      console.error('Save failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onSave, state.formData, state.yamlContent, state.validation.isValid]);

  // ============================================
  // Draft Management
  // ============================================

  const saveDraft = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const draft = {
        formData: state.formData,
        yamlContent: state.yamlContent,
        savedAt: Date.now(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [draftKey, state.formData, state.yamlContent]);

  const loadDraft = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      const stored = localStorage.getItem(draftKey);
      if (!stored) return false;

      const draft = JSON.parse(stored);
      if (draft.formData) {
        managerRef.current?.reset(draft.formData);
        return true;
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }

    return false;
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [draftKey]);

  // ============================================
  // Conflict Resolution
  // ============================================

  const resolveConflict = useCallback((source: 'form' | 'yaml') => {
    managerRef.current?.resolveConflict(source);
    setConflicts([]);
  }, []);

  // ============================================
  // Validation Helpers
  // ============================================

  const getFieldError = useCallback((path: string): ValidationError | undefined => {
    return state.validation.errors.find(e => e.path === path);
  }, [state.validation.errors]);

  const getFieldWarning = useCallback((path: string): ValidationError | undefined => {
    return state.validation.warnings.find(w => w.path === path);
  }, [state.validation.warnings]);

  const hasFieldError = useCallback((path: string): boolean => {
    return state.validation.errors.some(e => e.path === path);
  }, [state.validation.errors]);

  const triggerValidation = useCallback((): ValidationResult => {
    const formValidation = validateFormData(state.formData);
    const yamlValidation = validateYamlSyntax(state.yamlContent);

    return {
      isValid: formValidation.isValid && yamlValidation.isValid,
      errors: [...formValidation.errors, ...yamlValidation.errors],
      warnings: [...formValidation.warnings, ...yamlValidation.warnings],
    };
  }, [state.formData, state.yamlContent]);

  // ============================================
  // Export/Import Utilities
  // ============================================

  const exportYaml = useCallback((): string => {
    return formToYaml(state.formData);
  }, [state.formData]);

  const exportJson = useCallback((): string => {
    return formToJson(state.formData);
  }, [state.formData]);

  const importYaml = useCallback((yaml: string): boolean => {
    const validation = validateYamlSyntax(yaml);
    if (!validation.isValid) return false;

    const { data, errors } = yamlToForm(yaml);
    if (errors.filter(e => e.severity === 'error').length > 0) return false;

    managerRef.current?.reset(data);
    return true;
  }, []);

  const copyToClipboard = useCallback(async (format: 'yaml' | 'json'): Promise<boolean> => {
    try {
      const content = format === 'yaml' ? exportYaml() : exportJson();
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, [exportYaml, exportJson]);

  // ============================================
  // Return Value
  // ============================================

  return {
    // State
    state,
    formData: state.formData,
    yamlContent: state.yamlContent,
    jsonOutput: state.jsonOutput,
    validation: state.validation,

    // Status flags
    isLoading,
    isSyncing: state.isSyncing,
    isDirty: state.isDirty,
    hasConflict: state.hasConflict,
    isValid: state.validation.isValid,
    lastSource: state.lastSource,
    lastSyncTime: state.lastSyncTimestamp,

    // Actions
    updateForm,
    updateField,
    updateNestedField,
    updateYaml,
    reset,
    reload,
    save,
    saveDraft,
    loadDraft,
    clearDraft,

    // Conflict resolution
    resolveConflict,
    conflicts,

    // Validation helpers
    getFieldError,
    getFieldWarning,
    hasFieldError,
    triggerValidation,

    // Utilities
    exportYaml,
    exportJson,
    importYaml,
    copyToClipboard,
  };
}

// ============================================
// Additional Specialized Hooks
// ============================================

/**
 * Hook for form-only updates with optimized re-renders
 */
export function useFormField<K extends keyof AgentFormData>(
  preview: UseLivePreviewReturn,
  field: K
) {
  const value = preview.formData[field];
  const error = preview.getFieldError(field as string);
  const warning = preview.getFieldWarning(field as string);
  const hasError = preview.hasFieldError(field as string);

  const setValue = useCallback(
    (newValue: AgentFormData[K]) => {
      preview.updateField(field, newValue);
    },
    [preview, field]
  );

  return {
    value,
    setValue,
    error,
    warning,
    hasError,
    isDirty: preview.isDirty,
  };
}

/**
 * Hook for syncing with external sources
 */
export function useSyncWithExternal(
  preview: UseLivePreviewReturn,
  externalYaml: string | null,
  options: {
    autoSync?: boolean;
    onExternalChange?: (yaml: string) => void;
  } = {}
) {
  const { autoSync = false, onExternalChange } = options;
  const previousExternalRef = useRef<string | null>(null);

  useEffect(() => {
    if (externalYaml === null) return;
    if (externalYaml === previousExternalRef.current) return;

    previousExternalRef.current = externalYaml;

    if (autoSync) {
      preview.importYaml(externalYaml);
    }

    onExternalChange?.(externalYaml);
  }, [externalYaml, autoSync, preview, onExternalChange]);

  const syncFromExternal = useCallback(() => {
    if (externalYaml) {
      return preview.importYaml(externalYaml);
    }
    return false;
  }, [externalYaml, preview]);

  const syncToExternal = useCallback(() => {
    return preview.exportYaml();
  }, [preview]);

  return {
    syncFromExternal,
    syncToExternal,
    hasExternalChanges: externalYaml !== preview.yamlContent,
  };
}

/**
 * Hook for keyboard shortcuts
 */
export function useLivePreviewShortcuts(
  preview: UseLivePreviewReturn,
  options: {
    enableSaveShortcut?: boolean;
    enableResetShortcut?: boolean;
    enableCopyShortcut?: boolean;
  } = {}
) {
  const {
    enableSaveShortcut = true,
    enableResetShortcut = true,
    enableCopyShortcut = true,
  } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + S = Save
      if (enableSaveShortcut && isMod && e.key === 's') {
        e.preventDefault();
        preview.save();
      }

      // Cmd/Ctrl + Shift + R = Reset
      if (enableResetShortcut && isMod && e.shiftKey && e.key === 'r') {
        e.preventDefault();
        preview.reset();
      }

      // Cmd/Ctrl + Shift + C = Copy YAML
      if (enableCopyShortcut && isMod && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        preview.copyToClipboard('yaml');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [preview, enableSaveShortcut, enableResetShortcut, enableCopyShortcut]);
}

// ============================================
// Exports
// ============================================

export default useLivePreview;
