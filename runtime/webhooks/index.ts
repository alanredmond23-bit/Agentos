/**
 * index.ts
 * WebhookRouter - unified webhook routing and dispatching
 * Manages provider registration, event routing, and error handling
 */

import { WebhookRequest, VerificationResult, GenericHMACVerifier } from './providers/generic_hmac';
import { StripeWebhookVerifier, StripeEvent } from './providers/stripe';
import { TwilioWebhookVerifier, TwilioEvent } from './providers/twilio';
import { SinchWebhookVerifier, SinchEvent } from './providers/sinch';

// ============================================================================
// TYPES
// ============================================================================

export type WebhookProvider = 'stripe' | 'twilio' | 'sinch' | 'github' | 'slack' | 'shopify' | 'generic' | string;

export type WebhookEvent = StripeEvent | TwilioEvent | SinchEvent | Record<string, unknown>;

export interface WebhookVerifier {
  verify(request: WebhookRequest): VerificationResult;
  destroy?(): void;
}

export interface WebhookRouterConfig {
  /** Default provider for unmatched routes */
  default_provider?: WebhookProvider;

  /** Enable request logging */
  enable_logging?: boolean;

  /** Custom error handler */
  error_handler?: WebhookErrorHandler;

  /** Route prefix (e.g., '/webhooks') */
  route_prefix?: string;
}

export interface WebhookRoute {
  /** Provider identifier */
  provider: WebhookProvider;

  /** URL path pattern (supports wildcards) */
  path: string;

  /** Verifier instance */
  verifier: WebhookVerifier;

  /** Route-specific handler */
  handler?: WebhookRouteHandler;
}

export interface WebhookDispatchResult {
  /** Whether the webhook was successfully processed */
  success: boolean;

  /** Provider that handled the webhook */
  provider?: WebhookProvider;

  /** Verification result */
  verification?: VerificationResult;

  /** Parsed event */
  event?: WebhookEvent;

  /** Error if processing failed */
  error?: WebhookError;

  /** Processing time in ms */
  duration_ms?: number;
}

export interface WebhookError {
  code: string;
  message: string;
  provider?: WebhookProvider;
  recoverable: boolean;
}

export type WebhookRouteHandler = (event: WebhookEvent, provider: WebhookProvider) => Promise<void> | void;
export type WebhookErrorHandler = (error: WebhookError, request: WebhookRequest) => Promise<void> | void;
export type WebhookMiddleware = (request: WebhookRequest, next: () => Promise<WebhookDispatchResult>) => Promise<WebhookDispatchResult>;

// ============================================================================
// WEBHOOK ROUTER
// ============================================================================

export class WebhookRouter {
  private config: Required<Omit<WebhookRouterConfig, 'error_handler'>> & Pick<WebhookRouterConfig, 'error_handler'>;
  private routes: Map<string, WebhookRoute> = new Map();
  private providers: Map<WebhookProvider, WebhookVerifier> = new Map();
  private globalHandlers: WebhookRouteHandler[] = [];
  private middleware: WebhookMiddleware[] = [];

  constructor(config: WebhookRouterConfig = {}) {
    this.config = {
      default_provider: config.default_provider,
      enable_logging: config.enable_logging ?? false,
      error_handler: config.error_handler,
      route_prefix: config.route_prefix ?? '/webhooks'
    };
  }

  // ============================================================================
  // PROVIDER REGISTRATION
  // ============================================================================

  /**
   * Register a webhook provider
   */
  register(provider: WebhookProvider, verifier: WebhookVerifier): this {
    this.providers.set(provider, verifier);
    return this;
  }

  /**
   * Register a Stripe provider
   */
  registerStripe(signingSecret: string): this {
    const verifier = new StripeWebhookVerifier({ signing_secret: signingSecret });
    return this.register('stripe', verifier);
  }

  /**
   * Register a Twilio provider
   */
  registerTwilio(authToken: string, baseUrl?: string): this {
    const verifier = new TwilioWebhookVerifier({ auth_token: authToken, base_url: baseUrl });
    return this.register('twilio', verifier);
  }

  /**
   * Register a Sinch provider
   */
  registerSinch(appKey: string, appSecret: string): this {
    const verifier = new SinchWebhookVerifier({ app_key: appKey, app_secret: appSecret });
    return this.register('sinch', verifier);
  }

  /**
   * Register a generic HMAC provider
   */
  registerGeneric(name: string, config: { secret: string; signature_header: string }): this {
    const verifier = new GenericHMACVerifier({
      secret: config.secret,
      signature_header: config.signature_header
    });
    return this.register(name, verifier);
  }

  /**
   * Unregister a provider
   */
  unregister(provider: WebhookProvider): boolean {
    const verifier = this.providers.get(provider);
    if (verifier?.destroy) {
      verifier.destroy();
    }
    return this.providers.delete(provider);
  }

  // ============================================================================
  // ROUTE MANAGEMENT
  // ============================================================================

  /**
   * Add a route
   */
  route(path: string, provider: WebhookProvider, handler?: WebhookRouteHandler): this {
    const verifier = this.providers.get(provider);
    if (!verifier) {
      throw new Error(`Provider '${provider}' is not registered`);
    }

    const fullPath = this.normalizePath(path);
    this.routes.set(fullPath, {
      provider,
      path: fullPath,
      verifier,
      handler
    });

    return this;
  }

  /**
   * Remove a route
   */
  removeRoute(path: string): boolean {
    const fullPath = this.normalizePath(path);
    return this.routes.delete(fullPath);
  }

  /**
   * Add global event handler
   */
  onEvent(handler: WebhookRouteHandler): this {
    this.globalHandlers.push(handler);
    return this;
  }

  /**
   * Add middleware
   */
  use(middleware: WebhookMiddleware): this {
    this.middleware.push(middleware);
    return this;
  }

  // ============================================================================
  // REQUEST DISPATCHING
  // ============================================================================

  /**
   * Dispatch a webhook request
   */
  async dispatch(request: WebhookRequest): Promise<WebhookDispatchResult> {
    const startTime = Date.now();

    // Build middleware chain
    const execute = async (): Promise<WebhookDispatchResult> => {
      return this.processRequest(request);
    };

    // Apply middleware
    let handler = execute;
    for (let i = this.middleware.length - 1; i >= 0; i--) {
      const current = handler;
      const mw = this.middleware[i];
      handler = async () => mw(request, current);
    }

    try {
      const result = await handler();
      result.duration_ms = Date.now() - startTime;
      return result;
    } catch (error) {
      const webhookError: WebhookError = {
        code: 'DISPATCH_ERROR',
        message: (error as Error).message,
        recoverable: true
      };

      if (this.config.error_handler) {
        await this.config.error_handler(webhookError, request);
      }

      return {
        success: false,
        error: webhookError,
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Process the request internally
   */
  private async processRequest(request: WebhookRequest): Promise<WebhookDispatchResult> {
    // Find matching route
    const route = this.findRoute(request);

    if (!route) {
      // Try default provider
      if (this.config.default_provider) {
        const verifier = this.providers.get(this.config.default_provider);
        if (verifier) {
          return this.verifyAndDispatch(request, this.config.default_provider, verifier);
        }
      }

      return {
        success: false,
        error: {
          code: 'NO_ROUTE',
          message: 'No matching route found for webhook',
          recoverable: false
        }
      };
    }

    return this.verifyAndDispatch(request, route.provider, route.verifier, route.handler);
  }

  /**
   * Verify request and dispatch to handlers
   */
  private async verifyAndDispatch(
    request: WebhookRequest,
    provider: WebhookProvider,
    verifier: WebhookVerifier,
    routeHandler?: WebhookRouteHandler
  ): Promise<WebhookDispatchResult> {
    // Verify signature
    const verification = verifier.verify(request);

    if (!verification.valid) {
      const error: WebhookError = {
        code: verification.error_code ?? 'VERIFICATION_FAILED',
        message: verification.error ?? 'Webhook verification failed',
        provider,
        recoverable: verification.error_code === 'TIMESTAMP_EXPIRED'
      };

      if (this.config.error_handler) {
        await this.config.error_handler(error, request);
      }

      return {
        success: false,
        provider,
        verification,
        error
      };
    }

    // Parse event from verification result or body
    let event: WebhookEvent;
    if ('event' in verification && verification.event) {
      event = verification.event as WebhookEvent;
    } else {
      try {
        event = JSON.parse(request.body);
      } catch {
        event = { raw: request.body };
      }
    }

    // Call route-specific handler
    if (routeHandler) {
      await routeHandler(event, provider);
    }

    // Call global handlers
    for (const handler of this.globalHandlers) {
      await handler(event, provider);
    }

    if (this.config.enable_logging) {
      this.log('Webhook processed', { provider, event_type: this.getEventType(event) });
    }

    return {
      success: true,
      provider,
      verification,
      event
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Find matching route for request
   */
  private findRoute(request: WebhookRequest): WebhookRoute | undefined {
    if (!request.url) {
      return undefined;
    }

    const path = this.normalizePath(request.url);

    // Exact match
    if (this.routes.has(path)) {
      return this.routes.get(path);
    }

    // Wildcard matching
    for (const [routePath, route] of this.routes.entries()) {
      if (this.matchPath(path, routePath)) {
        return route;
      }
    }

    return undefined;
  }

  /**
   * Match path with wildcard support
   */
  private matchPath(path: string, pattern: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '[^/]+')
      .replace(/\*\*/g, '.*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Normalize path
   */
  private normalizePath(path: string): string {
    // Remove query string
    const pathOnly = path.split('?')[0];

    // Ensure leading slash
    let normalized = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;

    // Add prefix if not present
    if (!normalized.startsWith(this.config.route_prefix)) {
      normalized = `${this.config.route_prefix}${normalized}`;
    }

    return normalized;
  }

  /**
   * Get event type from event object
   */
  private getEventType(event: WebhookEvent): string {
    if ('type' in event) {
      return event.type as string;
    }
    return 'unknown';
  }

  /**
   * Log message
   */
  private log(message: string, data?: Record<string, unknown>): void {
    if (this.config.enable_logging) {
      console.log(`[WebhookRouter] ${message}`, data ?? '');
    }
  }

  /**
   * Get all registered providers
   */
  getProviders(): WebhookProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get all registered routes
   */
  getRoutes(): Array<{ path: string; provider: WebhookProvider }> {
    return Array.from(this.routes.entries()).map(([path, route]) => ({
      path,
      provider: route.provider
    }));
  }

  /**
   * Check if a provider is registered
   */
  hasProvider(provider: WebhookProvider): boolean {
    return this.providers.has(provider);
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    for (const verifier of this.providers.values()) {
      if (verifier.destroy) {
        verifier.destroy();
      }
    }
    this.providers.clear();
    this.routes.clear();
    this.globalHandlers = [];
    this.middleware = [];
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultRouter: WebhookRouter | null = null;

export function getWebhookRouter(): WebhookRouter {
  if (!defaultRouter) {
    defaultRouter = new WebhookRouter();
  }
  return defaultRouter;
}

export function setWebhookRouter(router: WebhookRouter): void {
  defaultRouter = router;
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { WebhookRequest, VerificationResult } from './providers/generic_hmac';
export { StripeEvent, StripeWebhookVerifier } from './providers/stripe';
export { TwilioEvent, TwilioWebhookVerifier } from './providers/twilio';
export { SinchEvent, SinchWebhookVerifier } from './providers/sinch';
