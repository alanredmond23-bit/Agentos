/**
 * AgentOS Studio - Global State Store
 * Zustand-based state management for the Studio module
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Pack,
  PackSummary,
  StudioAgent,
  AgentSummary,
  Template,
  TemplateSummary,
  Draft,
  ValidationResult,
  FilterOptions,
  StudioTab,
  EditorCursor,
  UUID,
} from '@/types/studio';

// ============================================
// State Types
// ============================================

interface PacksState {
  packs: PackSummary[];
  installedPackIds: Set<string>;
  installingPackIds: Set<string>;
  uninstallingPackIds: Set<string>;
  selectedPack: Pack | null;
  loading: boolean;
  error: string | null;
}

interface AgentsState {
  agents: AgentSummary[];
  selectedAgent: StudioAgent | null;
  loading: boolean;
  error: string | null;
}

interface EditorState {
  content: string;
  originalContent: string;
  isDirty: boolean;
  cursor: EditorCursor;
  validation: ValidationResult | null;
  isValidating: boolean;
  undoStack: string[];
  redoStack: string[];
  autoSaveEnabled: boolean;
  lastSavedAt: string | null;
}

interface TemplatesState {
  templates: TemplateSummary[];
  selectedTemplate: Template | null;
  loading: boolean;
}

interface DraftsState {
  drafts: Draft[];
  currentDraft: Draft | null;
}

interface UIState {
  sidebarCollapsed: boolean;
  activeTab: StudioTab;
  searchQuery: string;
  filters: FilterOptions;
  showValidationPanel: boolean;
  showVersionHistory: boolean;
  modalOpen: string | null;
}

interface StudioStoreState {
  packs: PacksState;
  agents: AgentsState;
  editor: EditorState;
  templates: TemplatesState;
  drafts: DraftsState;
  ui: UIState;
}

// ============================================
// Actions Types
// ============================================

interface PacksActions {
  setPacks: (packs: PackSummary[]) => void;
  setSelectedPack: (pack: Pack | null) => void;
  setPacksLoading: (loading: boolean) => void;
  setPacksError: (error: string | null) => void;
  addPack: (pack: PackSummary) => void;
  updatePack: (id: UUID, updates: Partial<PackSummary>) => void;
  removePack: (id: UUID) => void;
  // Pack installation actions
  installPack: (packId: UUID) => Promise<void>;
  uninstallPack: (packId: UUID) => Promise<void>;
  setInstalledPacks: (packIds: UUID[]) => void;
  isPackInstalled: (packId: UUID) => boolean;
  isPackInstalling: (packId: UUID) => boolean;
  isPackUninstalling: (packId: UUID) => boolean;
}

interface AgentsActions {
  setAgents: (agents: AgentSummary[]) => void;
  setSelectedAgent: (agent: StudioAgent | null) => void;
  setAgentsLoading: (loading: boolean) => void;
  setAgentsError: (error: string | null) => void;
  addAgent: (agent: AgentSummary) => void;
  updateAgent: (id: UUID, updates: Partial<AgentSummary>) => void;
  removeAgent: (id: UUID) => void;
}

interface EditorActions {
  setContent: (content: string) => void;
  setOriginalContent: (content: string) => void;
  setCursor: (cursor: EditorCursor) => void;
  setValidation: (validation: ValidationResult | null) => void;
  setIsValidating: (isValidating: boolean) => void;
  markClean: () => void;
  undo: () => void;
  redo: () => void;
  toggleAutoSave: () => void;
  recordSnapshot: () => void;
  resetEditor: () => void;
}

interface TemplatesActions {
  setTemplates: (templates: TemplateSummary[]) => void;
  setSelectedTemplate: (template: Template | null) => void;
  setTemplatesLoading: (loading: boolean) => void;
}

interface DraftsActions {
  setDrafts: (drafts: Draft[]) => void;
  setCurrentDraft: (draft: Draft | null) => void;
  addDraft: (draft: Draft) => void;
  updateDraft: (id: UUID, updates: Partial<Draft>) => void;
  removeDraft: (id: UUID) => void;
}

interface UIActions {
  toggleSidebar: () => void;
  setActiveTab: (tab: StudioTab) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  resetFilters: () => void;
  toggleValidationPanel: () => void;
  toggleVersionHistory: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

interface StoreActions
  extends PacksActions,
    AgentsActions,
    EditorActions,
    TemplatesActions,
    DraftsActions,
    UIActions {
  resetStore: () => void;
}

// ============================================
// Initial State
// ============================================

const initialPacksState: PacksState = {
  packs: [],
  installedPackIds: new Set<string>(),
  installingPackIds: new Set<string>(),
  uninstallingPackIds: new Set<string>(),
  selectedPack: null,
  loading: false,
  error: null,
};

const initialAgentsState: AgentsState = {
  agents: [],
  selectedAgent: null,
  loading: false,
  error: null,
};

const initialEditorState: EditorState = {
  content: '',
  originalContent: '',
  isDirty: false,
  cursor: { line: 1, column: 1 },
  validation: null,
  isValidating: false,
  undoStack: [],
  redoStack: [],
  autoSaveEnabled: true,
  lastSavedAt: null,
};

const initialTemplatesState: TemplatesState = {
  templates: [],
  selectedTemplate: null,
  loading: false,
};

const initialDraftsState: DraftsState = {
  drafts: [],
  currentDraft: null,
};

const initialUIState: UIState = {
  sidebarCollapsed: false,
  activeTab: 'agents',
  searchQuery: '',
  filters: {},
  showValidationPanel: true,
  showVersionHistory: false,
  modalOpen: null,
};

const initialState: StudioStoreState = {
  packs: initialPacksState,
  agents: initialAgentsState,
  editor: initialEditorState,
  templates: initialTemplatesState,
  drafts: initialDraftsState,
  ui: initialUIState,
};

// ============================================
// Store Definition
// ============================================

export const useStudioStore = create<StudioStoreState & StoreActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ============================================
      // Packs Actions
      // ============================================

      setPacks: (packs) =>
        set((state) => ({
          packs: { ...state.packs, packs },
        })),

      setSelectedPack: (pack) =>
        set((state) => ({
          packs: { ...state.packs, selectedPack: pack },
        })),

      setPacksLoading: (loading) =>
        set((state) => ({
          packs: { ...state.packs, loading },
        })),

      setPacksError: (error) =>
        set((state) => ({
          packs: { ...state.packs, error },
        })),

      addPack: (pack) =>
        set((state) => ({
          packs: { ...state.packs, packs: [...state.packs.packs, pack] },
        })),

      updatePack: (id, updates) =>
        set((state) => ({
          packs: {
            ...state.packs,
            packs: state.packs.packs.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            ),
            selectedPack:
              state.packs.selectedPack?.id === id
                ? ({ ...state.packs.selectedPack, ...updates } as Pack)
                : state.packs.selectedPack,
          },
        })),

      removePack: (id) =>
        set((state) => ({
          packs: {
            ...state.packs,
            packs: state.packs.packs.filter((p) => p.id !== id),
            selectedPack:
              state.packs.selectedPack?.id === id
                ? null
                : state.packs.selectedPack,
          },
        })),

      // Pack installation actions
      installPack: async (packId) => {
        const state = get();

        // Add to installing set
        set((s) => ({
          packs: {
            ...s.packs,
            installingPackIds: new Set([...s.packs.installingPackIds, packId]),
          },
        }));

        try {
          // Simulate API call - replace with actual API call
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Add to installed set and remove from installing
          set((s) => {
            const newInstallingIds = new Set(s.packs.installingPackIds);
            newInstallingIds.delete(packId);

            return {
              packs: {
                ...s.packs,
                installedPackIds: new Set([...s.packs.installedPackIds, packId]),
                installingPackIds: newInstallingIds,
              },
            };
          });
        } catch (error) {
          // Remove from installing on error
          set((s) => {
            const newInstallingIds = new Set(s.packs.installingPackIds);
            newInstallingIds.delete(packId);

            return {
              packs: {
                ...s.packs,
                installingPackIds: newInstallingIds,
                error: error instanceof Error ? error.message : 'Failed to install pack',
              },
            };
          });
        }
      },

      uninstallPack: async (packId) => {
        // Add to uninstalling set
        set((s) => ({
          packs: {
            ...s.packs,
            uninstallingPackIds: new Set([...s.packs.uninstallingPackIds, packId]),
          },
        }));

        try {
          // Simulate API call - replace with actual API call
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Remove from installed and uninstalling sets
          set((s) => {
            const newInstalledIds = new Set(s.packs.installedPackIds);
            newInstalledIds.delete(packId);

            const newUninstallingIds = new Set(s.packs.uninstallingPackIds);
            newUninstallingIds.delete(packId);

            return {
              packs: {
                ...s.packs,
                installedPackIds: newInstalledIds,
                uninstallingPackIds: newUninstallingIds,
              },
            };
          });
        } catch (error) {
          // Remove from uninstalling on error
          set((s) => {
            const newUninstallingIds = new Set(s.packs.uninstallingPackIds);
            newUninstallingIds.delete(packId);

            return {
              packs: {
                ...s.packs,
                uninstallingPackIds: newUninstallingIds,
                error: error instanceof Error ? error.message : 'Failed to uninstall pack',
              },
            };
          });
        }
      },

      setInstalledPacks: (packIds) =>
        set((state) => ({
          packs: {
            ...state.packs,
            installedPackIds: new Set(packIds),
          },
        })),

      isPackInstalled: (packId) => {
        const state = get();
        return state.packs.installedPackIds.has(packId);
      },

      isPackInstalling: (packId) => {
        const state = get();
        return state.packs.installingPackIds.has(packId);
      },

      isPackUninstalling: (packId) => {
        const state = get();
        return state.packs.uninstallingPackIds.has(packId);
      },

      // ============================================
      // Agents Actions
      // ============================================

      setAgents: (agents) =>
        set((state) => ({
          agents: { ...state.agents, agents },
        })),

      setSelectedAgent: (agent) =>
        set((state) => ({
          agents: { ...state.agents, selectedAgent: agent },
          editor: agent
            ? {
                ...state.editor,
                content: agent.yaml_content,
                originalContent: agent.yaml_content,
                isDirty: false,
                validation:
                  agent.validation_errors.length > 0
                    ? {
                        is_valid: false,
                        errors: agent.validation_errors,
                        warnings: [],
                        info: [],
                        validated_at: new Date().toISOString(),
                      }
                    : null,
              }
            : state.editor,
        })),

      setAgentsLoading: (loading) =>
        set((state) => ({
          agents: { ...state.agents, loading },
        })),

      setAgentsError: (error) =>
        set((state) => ({
          agents: { ...state.agents, error },
        })),

      addAgent: (agent) =>
        set((state) => ({
          agents: { ...state.agents, agents: [...state.agents.agents, agent] },
        })),

      updateAgent: (id, updates) =>
        set((state) => ({
          agents: {
            ...state.agents,
            agents: state.agents.agents.map((a) =>
              a.id === id ? { ...a, ...updates } : a
            ),
            selectedAgent:
              state.agents.selectedAgent?.id === id
                ? ({ ...state.agents.selectedAgent, ...updates } as StudioAgent)
                : state.agents.selectedAgent,
          },
        })),

      removeAgent: (id) =>
        set((state) => ({
          agents: {
            ...state.agents,
            agents: state.agents.agents.filter((a) => a.id !== id),
            selectedAgent:
              state.agents.selectedAgent?.id === id
                ? null
                : state.agents.selectedAgent,
          },
          editor:
            state.agents.selectedAgent?.id === id
              ? {
                  ...state.editor,
                  content: '',
                  originalContent: '',
                  isDirty: false,
                }
              : state.editor,
        })),

      // ============================================
      // Editor Actions
      // ============================================

      setContent: (content) =>
        set((state) => {
          const undoStack =
            state.editor.content !== content
              ? [...state.editor.undoStack, state.editor.content].slice(-100)
              : state.editor.undoStack;

          return {
            editor: {
              ...state.editor,
              content,
              isDirty: content !== state.editor.originalContent,
              undoStack,
              redoStack: state.editor.content !== content ? [] : state.editor.redoStack,
            },
          };
        }),

      setOriginalContent: (content) =>
        set((state) => ({
          editor: {
            ...state.editor,
            originalContent: content,
            isDirty: state.editor.content !== content,
          },
        })),

      setCursor: (cursor) =>
        set((state) => ({
          editor: { ...state.editor, cursor },
        })),

      setValidation: (validation) =>
        set((state) => ({
          editor: { ...state.editor, validation },
        })),

      setIsValidating: (isValidating) =>
        set((state) => ({
          editor: { ...state.editor, isValidating },
        })),

      markClean: () =>
        set((state) => ({
          editor: {
            ...state.editor,
            originalContent: state.editor.content,
            isDirty: false,
            lastSavedAt: new Date().toISOString(),
          },
        })),

      undo: () =>
        set((state) => {
          if (state.editor.undoStack.length === 0) return state;

          const undoStack = [...state.editor.undoStack];
          const previousContent = undoStack.pop()!;

          return {
            editor: {
              ...state.editor,
              content: previousContent,
              undoStack,
              redoStack: [...state.editor.redoStack, state.editor.content],
              isDirty: previousContent !== state.editor.originalContent,
            },
          };
        }),

      redo: () =>
        set((state) => {
          if (state.editor.redoStack.length === 0) return state;

          const redoStack = [...state.editor.redoStack];
          const nextContent = redoStack.pop()!;

          return {
            editor: {
              ...state.editor,
              content: nextContent,
              redoStack,
              undoStack: [...state.editor.undoStack, state.editor.content],
              isDirty: nextContent !== state.editor.originalContent,
            },
          };
        }),

      toggleAutoSave: () =>
        set((state) => ({
          editor: {
            ...state.editor,
            autoSaveEnabled: !state.editor.autoSaveEnabled,
          },
        })),

      recordSnapshot: () =>
        set((state) => ({
          editor: {
            ...state.editor,
            undoStack: [...state.editor.undoStack, state.editor.content].slice(-100),
            redoStack: [],
          },
        })),

      resetEditor: () =>
        set(() => ({
          editor: { ...initialEditorState },
        })),

      // ============================================
      // Templates Actions
      // ============================================

      setTemplates: (templates) =>
        set((state) => ({
          templates: { ...state.templates, templates },
        })),

      setSelectedTemplate: (template) =>
        set((state) => ({
          templates: { ...state.templates, selectedTemplate: template },
        })),

      setTemplatesLoading: (loading) =>
        set((state) => ({
          templates: { ...state.templates, loading },
        })),

      // ============================================
      // Drafts Actions
      // ============================================

      setDrafts: (drafts) =>
        set((state) => ({
          drafts: { ...state.drafts, drafts },
        })),

      setCurrentDraft: (draft) =>
        set((state) => ({
          drafts: { ...state.drafts, currentDraft: draft },
        })),

      addDraft: (draft) =>
        set((state) => ({
          drafts: { ...state.drafts, drafts: [draft, ...state.drafts.drafts] },
        })),

      updateDraft: (id, updates) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            drafts: state.drafts.drafts.map((d) =>
              d.id === id ? { ...d, ...updates } : d
            ),
            currentDraft:
              state.drafts.currentDraft?.id === id
                ? { ...state.drafts.currentDraft, ...updates }
                : state.drafts.currentDraft,
          },
        })),

      removeDraft: (id) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            drafts: state.drafts.drafts.filter((d) => d.id !== id),
            currentDraft:
              state.drafts.currentDraft?.id === id
                ? null
                : state.drafts.currentDraft,
          },
        })),

      // ============================================
      // UI Actions
      // ============================================

      toggleSidebar: () =>
        set((state) => ({
          ui: { ...state.ui, sidebarCollapsed: !state.ui.sidebarCollapsed },
        })),

      setActiveTab: (tab) =>
        set((state) => ({
          ui: { ...state.ui, activeTab: tab },
        })),

      setSearchQuery: (query) =>
        set((state) => ({
          ui: { ...state.ui, searchQuery: query },
        })),

      setFilters: (filters) =>
        set((state) => ({
          ui: { ...state.ui, filters: { ...state.ui.filters, ...filters } },
        })),

      resetFilters: () =>
        set((state) => ({
          ui: { ...state.ui, filters: {}, searchQuery: '' },
        })),

      toggleValidationPanel: () =>
        set((state) => ({
          ui: {
            ...state.ui,
            showValidationPanel: !state.ui.showValidationPanel,
          },
        })),

      toggleVersionHistory: () =>
        set((state) => ({
          ui: {
            ...state.ui,
            showVersionHistory: !state.ui.showVersionHistory,
          },
        })),

      openModal: (modalId) =>
        set((state) => ({
          ui: { ...state.ui, modalOpen: modalId },
        })),

      closeModal: () =>
        set((state) => ({
          ui: { ...state.ui, modalOpen: null },
        })),

      // ============================================
      // Global Actions
      // ============================================

      resetStore: () => set(initialState),
    }),
    {
      name: 'agentos-studio-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ui: {
          sidebarCollapsed: state.ui.sidebarCollapsed,
          activeTab: state.ui.activeTab,
          showValidationPanel: state.ui.showValidationPanel,
        },
        editor: {
          autoSaveEnabled: state.editor.autoSaveEnabled,
        },
      }),
    }
  )
);

// ============================================
// Selectors
// ============================================

export const selectPacks = (state: StudioStoreState) => state.packs.packs;
export const selectSelectedPack = (state: StudioStoreState) => state.packs.selectedPack;
export const selectPacksLoading = (state: StudioStoreState) => state.packs.loading;
export const selectInstalledPackIds = (state: StudioStoreState) => state.packs.installedPackIds;
export const selectInstallingPackIds = (state: StudioStoreState) => state.packs.installingPackIds;
export const selectUninstallingPackIds = (state: StudioStoreState) => state.packs.uninstallingPackIds;

export const selectAgents = (state: StudioStoreState) => state.agents.agents;
export const selectSelectedAgent = (state: StudioStoreState) => state.agents.selectedAgent;
export const selectAgentsLoading = (state: StudioStoreState) => state.agents.loading;

export const selectEditorContent = (state: StudioStoreState) => state.editor.content;
export const selectEditorIsDirty = (state: StudioStoreState) => state.editor.isDirty;
export const selectEditorValidation = (state: StudioStoreState) => state.editor.validation;
export const selectCanUndo = (state: StudioStoreState) => state.editor.undoStack.length > 0;
export const selectCanRedo = (state: StudioStoreState) => state.editor.redoStack.length > 0;

export const selectTemplates = (state: StudioStoreState) => state.templates.templates;
export const selectDrafts = (state: StudioStoreState) => state.drafts.drafts;

export const selectActiveTab = (state: StudioStoreState) => state.ui.activeTab;
export const selectSearchQuery = (state: StudioStoreState) => state.ui.searchQuery;
export const selectFilters = (state: StudioStoreState) => state.ui.filters;
export const selectModalOpen = (state: StudioStoreState) => state.ui.modalOpen;

// ============================================
// Derived Selectors
// ============================================

export const selectFilteredAgents = (state: StudioStoreState) => {
  let agents = state.agents.agents;

  if (state.ui.searchQuery) {
    const query = state.ui.searchQuery.toLowerCase();
    agents = agents.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.slug.toLowerCase().includes(query)
    );
  }

  if (state.ui.filters.status && state.ui.filters.status.length > 0) {
    agents = agents.filter((a) => state.ui.filters.status!.includes(a.status));
  }

  return agents;
};

export const selectAgentsByPack = (packId: UUID) => (state: StudioStoreState) => {
  return state.agents.agents.filter((a) => a.pack_id === packId);
};

export const selectHasUnsavedChanges = (state: StudioStoreState) => {
  return state.editor.isDirty;
};

export const selectValidationSummary = (state: StudioStoreState) => {
  const validation = state.editor.validation;
  if (!validation) return null;

  return {
    isValid: validation.is_valid,
    errorCount: validation.errors.length,
    warningCount: validation.warnings.length,
    infoCount: validation.info.length,
  };
};
