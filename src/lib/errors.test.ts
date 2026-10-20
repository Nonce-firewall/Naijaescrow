import { describe, it, expect } from 'vitest';
import { AppError, SupabaseError, ValidationError, AuthError, NotFoundError } from './errors';

describe('Typed Errors', () => {
  it('creates base AppError correctly', () => {
    const error = new AppError('General failure', 'ERR_CODE', 503, { reason: 'timeout' });
    expect(error.message).toBe('General failure');
    expect(error.code).toBe('ERR_CODE');
    expect(error.statusCode).toBe(503);
    expect(error.details).toEqual({ reason: 'timeout' });
    expect(error instanceof Error).toBe(true);
    expect(error instanceof AppError).toBe(true);
  });

  it('creates SupabaseError with default 500 status and DATABASE_ERROR code', () => {
    const error = new SupabaseError('Failed to fetch orders', { table: 'orders' });
    expect(error.message).toBe('Failed to fetch orders');
    expect(error.code).toBe('DATABASE_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.details).toEqual({ table: 'orders' });
    expect(error instanceof AppError).toBe(true);
  });

  it('creates ValidationError with 400 status', () => {
    const error = new ValidationError('Invalid amount', { field: 'cryptoAmount' });
    expect(error.message).toBe('Invalid amount');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ field: 'cryptoAmount' });
  });

  it('creates AuthError with 401 status', () => {
    const error = new AuthError('Token expired');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('AUTH_ERROR');
  });

  it('creates NotFoundError with 404 status', () => {
    const error = new NotFoundError('User not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });
});
