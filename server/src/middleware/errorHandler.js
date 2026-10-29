/**
 * Custom application errors
 */

export class ValidationError extends Error {
  constructor(details, message = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details; // Array of { field, message }
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Ticket not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class MethodNotAllowedError extends Error {
  constructor(message = 'Ticket deletion is not permitted. All ticket history and audit logs are permanently preserved.') {
    super(message);
    this.name = 'MethodNotAllowedError';
    this.statusCode = 405;
  }
}

/**
 * Global Express Error Handling Middleware
 */
export function errorHandler(err, req, res, next) {
  // Known operational validation error
  if (err instanceof ValidationError || err.statusCode === 400) {
    return res.status(400).json({
      error: err.message || 'Validation failed',
      details: err.details || []
    });
  }

  // Known 404 Not Found error
  if (err instanceof NotFoundError || err.statusCode === 404) {
    return res.status(404).json({
      error: err.message || 'Resource not found'
    });
  }

  // Known 405 Method Not Allowed error
  if (err instanceof MethodNotAllowedError || err.statusCode === 405) {
    return res.status(405).json({
      error: err.message,
      policy: 'No-deletion audit policy. Ticket destruction is prohibited to maintain complete history.'
    });
  }

  // Fallback 500 Server Error
  console.error('[Unhandled Error]:', err);
  return res.status(500).json({
    error: 'Internal Server Error'
  });
}
