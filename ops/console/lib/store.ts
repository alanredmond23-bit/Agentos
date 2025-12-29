/**
 * AgentOS Ops Console - Global State Store
 * Using Zustand for state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  User,
  Agent,
  ApprovalRequest,
  Notification,
  FilterState,
  DashboardMetrics,
} from '@/types';

// ============================================
// Auth Store
// ============================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));

// ============================================
// UI Store
// ============================================

interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  commandPaletteOpen: boolean;
  notificationPanelOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setNotificationPanelOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'system',
      commandPaletteOpen: false,
      notificationPanelOpen: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setTheme: (theme) => set({ theme }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      setNotificationPanelOpen: (notificationPanelOpen) =>
        set({ notificationPanelOpen }),
    }),
    {
      name: 'agentos-ui-preferences',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);

// ============================================
// Agents Store
// ============================================

interface AgentsState {
  agents: Agent[];
  selectedAgent: Agent | null;
  isLoading: boolean;
  error: string | null;
  filters: FilterState;
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  setSelectedAgent: (agent: Agent | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
}

const defaultAgentFilters: FilterState = {
  search: '',
  status: [],
  pack: [],
  risk_level: [],
  date_range: null,
};

export const useAgentsStore = create<AgentsState>()((set) => ({
  agents: [],
  selectedAgent: null,
  isLoading: false,
  error: null,
  filters: defaultAgentFilters,
  setAgents: (agents) => set({ agents }),
  addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, ...updates } : agent
      ),
      selectedAgent:
        state.selectedAgent?.id === id
          ? { ...state.selectedAgent, ...updates }
          : state.selectedAgent,
    })),
  removeAgent: (id) =>
    set((state) => ({
      agents: state.agents.filter((agent) => agent.id !== id),
      selectedAgent:
        state.selectedAgent?.id === id ? null : state.selectedAgent,
    })),
  setSelectedAgent: (selectedAgent) => set({ selectedAgent }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: defaultAgentFilters }),
}));

// ============================================
// Approvals Store
// ============================================

interface ApprovalsState {
  approvals: ApprovalRequest[];
  pendingCount: number;
  isLoading: boolean;
  error: string | null;
  filters: FilterState;
  setApprovals: (approvals: ApprovalRequest[]) => void;
  addApproval: (approval: ApprovalRequest) => void;
  updateApproval: (id: string, updates: Partial<ApprovalRequest>) => void;
  removeApproval: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
}

const defaultApprovalFilters: FilterState = {
  search: '',
  status: ['pending'],
  pack: [],
  risk_level: [],
  date_range: null,
};

export const useApprovalsStore = create<ApprovalsState>()((set) => ({
  approvals: [],
  pendingCount: 0,
  isLoading: false,
  error: null,
  filters: defaultApprovalFilters,
  setApprovals: (approvals) =>
    set({
      approvals,
      pendingCount: approvals.filter((a) => a.status === 'pending').length,
    }),
  addApproval: (approval) =>
    set((state) => ({
      approvals: [approval, ...state.approvals],
      pendingCount:
        approval.status === 'pending'
          ? state.pendingCount + 1
          : state.pendingCount,
    })),
  updateApproval: (id, updates) =>
    set((state) => {
      const updatedApprovals = state.approvals.map((approval) =>
        approval.id === id ? { ...approval, ...updates } : approval
      );
      return {
        approvals: updatedApprovals,
        pendingCount: updatedApprovals.filter((a) => a.status === 'pending')
          .length,
      };
    }),
  removeApproval: (id) =>
    set((state) => {
      const approval = state.approvals.find((a) => a.id === id);
      return {
        approvals: state.approvals.filter((a) => a.id !== id),
        pendingCount:
          approval?.status === 'pending'
            ? state.pendingCount - 1
            : state.pendingCount,
      };
    }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: defaultApprovalFilters }),
}));

// ============================================
// Notifications Store
// ============================================

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
    })),
  markAsRead: (id) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      if (!notification || notification.read) return state;
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  removeNotification: (id) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount:
          notification && !notification.read
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount,
      };
    }),
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));

// ============================================
// Dashboard Store
// ============================================

interface DashboardState {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  setMetrics: (metrics: DashboardMetrics) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  metrics: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  setMetrics: (metrics) =>
    set({ metrics, lastUpdated: new Date().toISOString() }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

// ============================================
// WebSocket Store
// ============================================

interface WebSocketState {
  isConnected: boolean;
  connectionError: string | null;
  lastMessage: unknown | null;
  reconnectAttempts: number;
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setLastMessage: (message: unknown) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
}

export const useWebSocketStore = create<WebSocketState>()((set) => ({
  isConnected: false,
  connectionError: null,
  lastMessage: null,
  reconnectAttempts: 0,
  setConnected: (isConnected) =>
    set({ isConnected, connectionError: isConnected ? null : undefined }),
  setConnectionError: (connectionError) => set({ connectionError }),
  setLastMessage: (lastMessage) => set({ lastMessage }),
  incrementReconnectAttempts: () =>
    set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),
  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
}));
