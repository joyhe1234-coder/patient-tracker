/**
 * Error Handler Middleware Tests
 *
 * Tests for errorHandler function and createError factory.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { errorHandler, createError, AppError } from '../errorHandler.js';
import { Request, Response, NextFunction } from 'express';

// Helper to create mock Express objects
function createMockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function createMockReq() {
  return {} as Request;
}

const mockNext = jest.fn() as unknown as NextFunction;

describe('errorHandler', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns 500 with INTERNAL_ERROR for generic errors', () => {
    const err = new Error('Something broke') as AppError;
    const res = createMockRes();

    errorHandler(err, createMockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.objectContaining({
        code: 'INTERNAL_ERROR',
        message: 'Something broke',
      }),
    });
  });

  it('uses statusCode from AppError', () => {
    const err: AppError = new Error('Not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    const res = createMockRes();

    errorHandler(err, createMockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.objectContaining({
        code: 'NOT_FOUND',
        message: 'Not found',
      }),
    });
  });

  it('uses custom code from AppError', () => {
    const err: AppError = new Error('Forbidden');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    const res = createMockRes();

    errorHandler(err, createMockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    );
  });

  it('defaults message to generic message when empty', () => {
    const err: AppError = new Error('');
    const res = createMockRes();

    errorHandler(err, createMockReq(), res, mockNext);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'An unexpected error occurred',
        }),
      })
    );
  });

  it('includes stack trace in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const err: AppError = new Error('Dev error');
    err.statusCode = 400;
    const res = createMockRes();

    errorHandler(err, createMockReq(), res, mockNext);

    const jsonCall = (res.json as jest.Mock).mock.calls[0][0] as Record<string, any>;
    expect(jsonCall.error.stack).toBeDefined();

    process.env.NODE_ENV = originalEnv;
  });

  it('omits stack trace in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err: AppError = new Error('Prod error');
    err.statusCode = 400;
    const res = createMockRes();

    errorHandler(err, createMockReq(), res, mockNext);

    const jsonCall = (res.json as jest.Mock).mock.calls[0][0] as Record<string, any>;
    expect(jsonCall.error.stack).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });

  it('logs error to console via logger', () => {
    const err = new Error('test log');
    const res = createMockRes();

    errorHandler(err as AppError, createMockReq(), res, mockNext);

    // Logger wraps console.error — verify it was called with structured message
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const firstArg = consoleSpy.mock.calls[0][0] as string;
    expect(firstArg).toContain('Unhandled error');
  });
});

describe('createError', () => {
  it('creates an error with message, statusCode, and code', () => {
    const err = createError('Bad request', 400, 'VALIDATION_ERROR');

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Bad request');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('defaults statusCode to 500', () => {
    const err = createError('Server error');

    expect(err.statusCode).toBe(500);
  });

  it('defaults code to INTERNAL_ERROR', () => {
    const err = createError('Oops');

    expect(err.code).toBe('INTERNAL_ERROR');
  });

  it('works end-to-end with errorHandler', () => {
    const err = createError('Duplicate entry', 409, 'DUPLICATE');
    const res = createMockRes();

    errorHandler(err, createMockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.objectContaining({
        code: 'DUPLICATE',
        message: 'Duplicate entry',
      }),
    });
  });
});
