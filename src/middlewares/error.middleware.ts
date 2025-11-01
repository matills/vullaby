import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

interface ErrorResponse {
  error: string;
  status: number;
  stack?: string;
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const errorResponse: ErrorResponse = {
    error: 'Internal server error',
    status: 500,
  };

  if (err instanceof AppError) {
    errorResponse.error = err.message;
    errorResponse.status = err.statusCode;

    logger.error({
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      statusCode: err.statusCode,
    });
  } else {
    logger.error({
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
    });
  }

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(errorResponse.status).json(errorResponse);
};