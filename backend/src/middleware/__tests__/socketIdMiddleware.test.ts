/**
 * Socket ID Middleware Tests
 *
 * Tests for socketIdMiddleware — extracts X-Socket-ID header
 * and attaches it to req.socketId for broadcast exclusion.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { socketIdMiddleware } from '../socketIdMiddleware.js';
import { Request, Response, NextFunction } from 'express';

function createMockReq(headers: Record<string, string> = {}): Request {
  return {
    headers,
  } as unknown as Request;
}

const mockRes = {} as Response;
const mockNext = jest.fn() as unknown as NextFunction;

describe('socketIdMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('attaches socketId to req when X-Socket-ID header is present', () => {
    const req = createMockReq({ 'x-socket-id': 'abc-123' });

    socketIdMiddleware(req, mockRes, mockNext);

    expect(req.socketId).toBe('abc-123');
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('does not set socketId when header is missing', () => {
    const req = createMockReq({});

    socketIdMiddleware(req, mockRes, mockNext);

    expect(req.socketId).toBeUndefined();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('always calls next()', () => {
    const reqWithHeader = createMockReq({ 'x-socket-id': 'socket-1' });
    const reqWithout = createMockReq({});

    socketIdMiddleware(reqWithHeader, mockRes, mockNext);
    socketIdMiddleware(reqWithout, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(2);
  });

  it('handles empty string header value', () => {
    const req = createMockReq({ 'x-socket-id': '' });

    socketIdMiddleware(req, mockRes, mockNext);

    // Empty string is falsy, so socketId should not be set
    expect(req.socketId).toBeUndefined();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('preserves full socket ID format', () => {
    const socketId = 'xYz-AbC_12345-long-socket-id';
    const req = createMockReq({ 'x-socket-id': socketId });

    socketIdMiddleware(req, mockRes, mockNext);

    expect(req.socketId).toBe(socketId);
  });
});
