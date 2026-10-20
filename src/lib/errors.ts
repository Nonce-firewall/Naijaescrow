export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code = 'INTERNAL_ERROR', statusCode = 500, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SupabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', 500, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', 401, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', 404, details);
  }
}
