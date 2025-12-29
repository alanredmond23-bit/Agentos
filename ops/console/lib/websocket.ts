/**
 * AgentOS Ops Console - WebSocket Client
 * Real-time communication with the AgentOS backend
 */

import type { WebSocketMessage, WebSocketConfig } from '@/types';
import { useWebSocketStore } from './store';

// ============================================
// WebSocket Configuration
// ============================================

const DEFAULT_CONFIG: WebSocketConfig = {
  url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080/ws',
  reconnect_interval_ms: 3000,
  max_reconnect_attempts: 10,
  heartbeat_interval_ms: 30000,
};

// ============================================
// WebSocket Event Types
// ============================================

type MessageHandler = (message: WebSocketMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Event) => void;

interface WebSocketHandlers {
  onMessage?: MessageHandler;
  onConnect?: ConnectionHandler;
  onDisconnect?: ConnectionHandler;
  onError?: ErrorHandler;
}

// ============================================
// WebSocket Client Class
// ============================================

class WebSocketClient {
  private socket: WebSocket | null = null;
  private config: WebSocketConfig;
  private handlers: WebSocketHandlers = {};
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isManualClose = false;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.warn('[WebSocket] Already connected');
      return;
    }

    if (this.socket?.readyState === WebSocket.CONNECTING) {
      console.warn('[WebSocket] Connection in progress');
      return;
    }

    this.isManualClose = false;

    try {
      this.socket = new WebSocket(this.config.url);
      this.setupEventListeners();
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.isManualClose = true;
    this.cleanup();

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    useWebSocketStore.getState().setConnected(false);
  }

  /**
   * Send a message to the server
   */
  send(message: WebSocketMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Not connected, queuing message');
      this.messageQueue.push(message);
      return false;
    }

    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error);
      return false;
    }
  }

  /**
   * Register event handlers
   */
  on(event: keyof WebSocketHandlers, handler: WebSocketHandlers[typeof event]): void {
    this.handlers[event] = handler as WebSocketHandlers[typeof event];
  }

  /**
   * Remove event handlers
   */
  off(event: keyof WebSocketHandlers): void {
    delete this.handlers[event];
  }

  /**
   * Get the current connection state
   */
  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get the WebSocket ready state
   */
  get readyState(): number {
    return this.socket?.readyState ?? WebSocket.CLOSED;
  }

  // ============================================
  // Private Methods
  // ============================================

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      console.log('[WebSocket] Connected');
      useWebSocketStore.getState().setConnected(true);
      useWebSocketStore.getState().resetReconnectAttempts();

      // Start heartbeat
      this.startHeartbeat();

      // Flush message queue
      this.flushMessageQueue();

      // Notify handler
      this.handlers.onConnect?.();
    };

    this.socket.onclose = (event) => {
      console.log('[WebSocket] Disconnected:', event.code, event.reason);
      useWebSocketStore.getState().setConnected(false);
      this.cleanup();

      // Notify handler
      this.handlers.onDisconnect?.();

      // Attempt reconnect if not manual close
      if (!this.isManualClose) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      useWebSocketStore.getState().setConnectionError('Connection error');

      // Notify handler
      this.handlers.onError?.(error);
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        useWebSocketStore.getState().setLastMessage(message);

        // Handle heartbeat response
        if (message.type === 'heartbeat') {
          return;
        }

        // Notify handler
        this.handlers.onMessage?.(message);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatIntervalId = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'heartbeat',
          payload: { timestamp: Date.now() },
          timestamp: new Date().toISOString(),
        });
      }
    }, this.config.heartbeat_interval_ms);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  private scheduleReconnect(): void {
    const store = useWebSocketStore.getState();

    if (store.reconnectAttempts >= this.config.max_reconnect_attempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      store.setConnectionError('Max reconnection attempts reached');
      return;
    }

    // Calculate exponential backoff
    const delay = Math.min(
      this.config.reconnect_interval_ms * Math.pow(2, store.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${store.reconnectAttempts + 1})`);

    this.reconnectTimeoutId = setTimeout(() => {
      store.incrementReconnectAttempts();
      this.connect();
    }, delay);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private cleanup(): void {
    this.stopHeartbeat();

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(config?: Partial<WebSocketConfig>): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient(config);
  }
  return wsClient;
}

// ============================================
// React Hook for WebSocket
// ============================================

import { useEffect, useCallback, useRef } from 'react';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onMessage?: MessageHandler;
  onConnect?: ConnectionHandler;
  onDisconnect?: ConnectionHandler;
  onError?: ErrorHandler;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const clientRef = useRef<WebSocketClient | null>(null);
  const { isConnected, connectionError, lastMessage, reconnectAttempts } =
    useWebSocketStore();

  // Initialize client
  useEffect(() => {
    clientRef.current = getWebSocketClient();

    // Set up handlers
    if (onMessage) clientRef.current.on('onMessage', onMessage);
    if (onConnect) clientRef.current.on('onConnect', onConnect);
    if (onDisconnect) clientRef.current.on('onDisconnect', onDisconnect);
    if (onError) clientRef.current.on('onError', onError);

    // Auto-connect
    if (autoConnect) {
      clientRef.current.connect();
    }

    return () => {
      // Clean up handlers but don't disconnect
      if (clientRef.current) {
        clientRef.current.off('onMessage');
        clientRef.current.off('onConnect');
        clientRef.current.off('onDisconnect');
        clientRef.current.off('onError');
      }
    };
  }, [autoConnect, onMessage, onConnect, onDisconnect, onError]);

  const connect = useCallback(() => {
    clientRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  const send = useCallback((message: WebSocketMessage) => {
    return clientRef.current?.send(message) ?? false;
  }, []);

  return {
    isConnected,
    connectionError,
    lastMessage,
    reconnectAttempts,
    connect,
    disconnect,
    send,
  };
}

// ============================================
// WebSocket Message Helpers
// ============================================

export function createMessage(
  type: WebSocketMessage['type'],
  payload: unknown
): WebSocketMessage {
  return {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
}

export function subscribeToAgent(agentId: string): WebSocketMessage {
  return createMessage('agent_status_changed', { subscribe: true, agent_id: agentId });
}

export function unsubscribeFromAgent(agentId: string): WebSocketMessage {
  return createMessage('agent_status_changed', { subscribe: false, agent_id: agentId });
}

export function subscribeToApprovals(): WebSocketMessage {
  return createMessage('approval_request_created', { subscribe: true });
}

export function unsubscribeFromApprovals(): WebSocketMessage {
  return createMessage('approval_request_created', { subscribe: false });
}
