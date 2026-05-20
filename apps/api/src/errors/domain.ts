/**
 * Structured domain error classes.
 *
 * Services throw these to express business-level failures.
 * The global Elysia error handler maps them to HTTP status codes.
 */

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'FORBIDDEN');
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Resource not found') {
    super(message, 'NOT_FOUND');
  }
}

export class ConflictError extends DomainError {
  constructor(message = 'Resource conflict') {
    super(message, 'CONFLICT');
  }
}
