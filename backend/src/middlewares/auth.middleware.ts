import { Request, Response, NextFunction } from 'express';
import { requestContext, RequestContext } from '../core/request-context';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extended Request interface with user data
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    businessId: string;
    role: string;
    email?: string;
  };
}

/**
 * Middleware to set up request context
 * This middleware extracts business context from the request and stores it in AsyncLocalStorage
 */
export function requestContextMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  // Generate a unique request ID
  const requestId = uuidv4();

  // Extract business ID from various sources
  let businessId: string | undefined;
  let userId: string | undefined;
  let userRole: string | undefined;

  // Priority 1: From authenticated user (set by authentication middleware)
  if (req.user?.businessId) {
    businessId = req.user.businessId;
    userId = req.user.id;
    userRole = req.user.role;
  }

  // Priority 2: From header (for API clients)
  if (!businessId && req.headers['x-business-id']) {
    businessId = req.headers['x-business-id'] as string;
  }

  // Priority 3: From query parameter (for testing/development)
  if (!businessId && req.query.businessId) {
    businessId = req.query.businessId as string;
  }

  // Priority 4: Default business ID from environment (fallback for development)
  if (!businessId && process.env.DEFAULT_BUSINESS_ID) {
    businessId = process.env.DEFAULT_BUSINESS_ID;
    logger.warn('Using DEFAULT_BUSINESS_ID from environment', { requestId });
  }

  if (!businessId) {
    logger.error('No business ID found in request', { requestId, path: req.path });
    res.status(400).json({
      error: 'Business ID is required',
      message: 'Please provide a business ID via authentication, header, or query parameter'
    });
    return;
  }

  // Create request context
  const context: RequestContext = {
    businessId,
    userId,
    userRole,
    requestId
  };

  // Run the rest of the request in this context
  requestContext.run(context, () => {
    logger.debug('Request context initialized', {
      requestId,
      businessId,
      userId,
      path: req.path,
      method: req.method
    });

    next();
  });
}

/**
 * Simple authentication middleware for business users
 * This is a placeholder - replace with your actual authentication logic (JWT, OAuth, etc.)
 */
export function authenticateBusinessUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  // TODO: Implement actual authentication logic
  // For now, this is a placeholder that extracts user info from headers

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    return;
  }

  try {
    // TODO: Verify JWT token and extract user data
    // For now, we'll use a simple Bearer token format: Bearer <userId>:<businessId>:<role>

    const token = authHeader.replace('Bearer ', '');
    const [userId, businessId, role] = token.split(':');

    if (!userId || !businessId || !role) {
      throw new Error('Invalid token format');
    }

    // Set user data on request
    req.user = {
      id: userId,
      businessId,
      role
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authentication token'
    });
  }
}

/**
 * Middleware to check if user has required role
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
}

/**
 * Optional authentication middleware - sets user if token is provided, but doesn't require it
 */
export function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const [userId, businessId, role] = token.split(':');

    if (userId && businessId && role) {
      req.user = {
        id: userId,
        businessId,
        role
      };
    }

    next();
  } catch (error) {
    // If optional auth fails, just continue without user
    logger.debug('Optional auth failed, continuing without user');
    next();
  }
}
