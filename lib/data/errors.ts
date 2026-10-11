/**
 * Domain and Data-Access Typed Errors for ScopeGuard.
 * These errors enforce layer separation and clear status reporting.
 */

export class UnauthorizedError extends Error {
  public readonly statusCode = 401;

  constructor(message = "Authentication required. Please sign in.") {
    super(message);
    this.name = "UnauthorizedError";
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends Error {
  public readonly statusCode = 403;

  constructor(message = "Access forbidden. Insufficient permissions.") {
    super(message);
    this.name = "ForbiddenError";
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class WorkspaceNotFoundError extends Error {
  public readonly statusCode = 404;

  constructor(message = "No active workspace found for user.") {
    super(message);
    this.name = "WorkspaceNotFoundError";
    Object.setPrototypeOf(this, WorkspaceNotFoundError.prototype);
  }
}

export class NotFoundError extends Error {
  public readonly statusCode = 404;

  constructor(message = "Requested resource not found.") {
    super(message);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

