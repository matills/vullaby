import { AsyncLocalStorage } from 'async_hooks';
import { logger } from '../config/logger';

/**
 * Request context data structure
 */
export interface RequestContext {
  businessId: string;
  userId?: string;
  userRole?: string;
  requestId?: string;
}

/**
 * AsyncLocalStorage instance for storing request-scoped data
 */
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * RequestContext - Manages request-scoped context using AsyncLocalStorage
 * This allows us to access businessId and other context data without passing it through every function
 */
export class RequestContextService {
  /**
   * Run a function with a specific context
   */
  run<T>(context: RequestContext, callback: () => T): T {
    return asyncLocalStorage.run(context, callback);
  }

  /**
   * Get the current request context
   */
  getContext(): RequestContext | undefined {
    return asyncLocalStorage.getStore();
  }

  /**
   * Get the business ID from the current context
   * Throws an error if context is not set or businessId is missing
   */
  getBusinessId(): string {
    const context = this.getContext();

    if (!context) {
      logger.error('No request context found');
      throw new Error('Request context not initialized');
    }

    if (!context.businessId) {
      logger.error('Business ID not found in request context');
      throw new Error('Business ID not found in request context');
    }

    return context.businessId;
  }

  /**
   * Get the business ID from the current context, or return undefined if not set
   */
  getBusinessIdOrUndefined(): string | undefined {
    const context = this.getContext();
    return context?.businessId;
  }

  /**
   * Get the user ID from the current context
   */
  getUserId(): string | undefined {
    const context = this.getContext();
    return context?.userId;
  }

  /**
   * Get the user role from the current context
   */
  getUserRole(): string | undefined {
    const context = this.getContext();
    return context?.userRole;
  }

  /**
   * Get the request ID from the current context
   */
  getRequestId(): string | undefined {
    const context = this.getContext();
    return context?.requestId;
  }

  /**
   * Check if a context is currently active
   */
  hasContext(): boolean {
    return this.getContext() !== undefined;
  }
}

// Export singleton instance
export const requestContext = new RequestContextService();
