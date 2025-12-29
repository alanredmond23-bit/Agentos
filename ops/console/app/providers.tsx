'use client';

/**
 * AgentOS Ops Console - Client Providers
 * Wraps the application with necessary context providers
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUIStore, useAuthStore } from '@/lib/store';

// ============================================
// Query Client Configuration
// ============================================

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error instanceof Error && 'status' in error) {
            const status = (error as { status: number }).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          return failureCount < 3;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: make a new query client if we don't already have one
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

// ============================================
// Providers Component
// ============================================

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WebSocketProvider>{children}</WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// ============================================
// Theme Provider
// ============================================

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore();

  React.useEffect(() => {
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      // Check system preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);

      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return <>{children}</>;
}

// ============================================
// Auth Provider
// ============================================

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  React.useEffect(() => {
    // Initialize auth state
    // In production, this would check Supabase session
    const initAuth = async () => {
      try {
        // Simulate loading auth state
        await new Promise((resolve) => setTimeout(resolve, 500));

        // For demo purposes, set a mock user
        // In production, this would fetch the actual user from Supabase
        setUser({
          id: 'user-1',
          email: 'operator@agentos.io',
          full_name: 'Ops Admin',
          avatar_url: null,
          role: 'admin',
          department: 'Operations',
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
          is_active: true,
          preferences: {
            theme: 'system',
            notifications_enabled: true,
            email_notifications: true,
            timezone: 'America/Los_Angeles',
            locale: 'en-US',
            sidebar_collapsed: false,
          },
        });
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [setUser, setLoading]);

  return <>{children}</>;
}

// ============================================
// WebSocket Provider
// ============================================

import { useWebSocket } from '@/lib/websocket';
import { useApprovalsStore, useNotificationsStore } from '@/lib/store';
import type { WebSocketMessage } from '@/types';

function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { addApproval, updateApproval } = useApprovalsStore();
  const { addNotification } = useNotificationsStore();

  const handleMessage = React.useCallback(
    (message: WebSocketMessage) => {
      switch (message.type) {
        case 'approval_request_created':
          // Add new approval to store
          if (message.payload && typeof message.payload === 'object') {
            addApproval(message.payload as Parameters<typeof addApproval>[0]);
            addNotification({
              id: crypto.randomUUID(),
              type: 'approval_required',
              title: 'New Approval Request',
              message: 'An agent is requesting approval for an action.',
              read: false,
              created_at: new Date().toISOString(),
            });
          }
          break;

        case 'approval_status_changed':
          // Update approval status
          if (message.payload && typeof message.payload === 'object') {
            const payload = message.payload as { id: string; status: string };
            updateApproval(payload.id, { status: payload.status as Parameters<typeof updateApproval>[1]['status'] });
          }
          break;

        case 'agent_status_changed':
          // Handle agent status updates
          // This would update the agents store
          break;

        case 'execution_completed':
          // Handle execution completions
          addNotification({
            id: crypto.randomUUID(),
            type: 'success',
            title: 'Execution Completed',
            message: 'An agent task has completed successfully.',
            read: false,
            created_at: new Date().toISOString(),
          });
          break;

        case 'error':
          // Handle errors
          addNotification({
            id: crypto.randomUUID(),
            type: 'error',
            title: 'Error',
            message: (message.payload as { message?: string })?.message || 'An error occurred.',
            read: false,
            created_at: new Date().toISOString(),
          });
          break;

        default:
          console.log('Unhandled WebSocket message:', message);
      }
    },
    [addApproval, updateApproval, addNotification]
  );

  // Initialize WebSocket connection
  useWebSocket({
    autoConnect: true,
    onMessage: handleMessage,
    onConnect: () => {
      console.log('[Providers] WebSocket connected');
    },
    onDisconnect: () => {
      console.log('[Providers] WebSocket disconnected');
    },
    onError: (error) => {
      console.error('[Providers] WebSocket error:', error);
    },
  });

  return <>{children}</>;
}

export default Providers;
