/**
 * Socket Auth Middleware Tests
 *
 * Tests for Socket.IO authentication middleware that verifies JWT tokens
 * from socket.handshake.auth.token and attaches user data to socket.data.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockVerifyToken = jest.fn<any>();
const mockFindUserById = jest.fn<any>();
/* eslint-enable @typescript-eslint/no-explicit-any */

// Use unstable_mockModule for ESM compatibility
jest.unstable_mockModule('../../services/authService.js', () => ({
  verifyToken: mockVerifyToken,
  findUserById: mockFindUserById,
}));

// Dynamic import after mock setup (ESM requirement)
const { socketAuthMiddleware } = await import('../socketAuth.js');

// Helper to create a mock socket
function createMockSocket(token?: string) {
  return {
    handshake: {
      auth: token !== undefined ? { token } : {},
    },
    data: {} as Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('socketAuthMiddleware', () => {
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should call next with error when no token is provided', async () => {
    const socket = createMockSocket();

    await socketAuthMiddleware(socket, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = mockNext.mock.calls[0][0] as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('no token');
  });

  it('should call next with error when token is undefined', async () => {
    const socket = createMockSocket(undefined);
    // Explicitly set auth without token
    socket.handshake.auth = {};

    await socketAuthMiddleware(socket, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = mockNext.mock.calls[0][0] as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('no token');
  });

  it('should call next with error when token is invalid', async () => {
    const socket = createMockSocket('invalid-token');
    mockVerifyToken.mockReturnValue(null);

    await socketAuthMiddleware(socket, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = mockNext.mock.calls[0][0] as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('invalid or expired');
  });

  it('should call next with error when user is not found', async () => {
    const socket = createMockSocket('valid-token');
    mockVerifyToken.mockReturnValue({ userId: 999, email: 'gone@test.com', roles: ['PHYSICIAN'] });
    mockFindUserById.mockResolvedValue(null);

    await socketAuthMiddleware(socket, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = mockNext.mock.calls[0][0] as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('user not found');
  });

  it('should call next with error when user is deactivated', async () => {
    const socket = createMockSocket('valid-token');
    mockVerifyToken.mockReturnValue({ userId: 1, email: 'test@test.com', roles: ['PHYSICIAN'] });
    mockFindUserById.mockResolvedValue({
      id: 1,
      email: 'test@test.com',
      displayName: 'Test User',
      roles: ['PHYSICIAN'],
      isActive: false,
    });

    await socketAuthMiddleware(socket, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = mockNext.mock.calls[0][0] as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('deactivated');
  });

  it('should authenticate successfully and populate socket.data', async () => {
    const socket = createMockSocket('valid-token');
    mockVerifyToken.mockReturnValue({ userId: 1, email: 'doc@clinic.com', roles: ['PHYSICIAN'] });
    mockFindUserById.mockResolvedValue({
      id: 1,
      email: 'doc@clinic.com',
      displayName: 'Dr. Smith',
      roles: ['PHYSICIAN'],
      isActive: true,
    });

    await socketAuthMiddleware(socket, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(); // Called without error
    expect(socket.data.userId).toBe(1);
    expect(socket.data.email).toBe('doc@clinic.com');
    expect(socket.data.displayName).toBe('Dr. Smith');
    expect(socket.data.roles).toEqual(['PHYSICIAN']);
    expect(socket.data.currentRoom).toBeNull();
  });

  it('should handle admin user with multiple roles', async () => {
    const socket = createMockSocket('admin-token');
    mockVerifyToken.mockReturnValue({ userId: 5, email: 'admin@clinic.com', roles: ['ADMIN', 'PHYSICIAN'] });
    mockFindUserById.mockResolvedValue({
      id: 5,
      email: 'admin@clinic.com',
      displayName: 'Admin Doc',
      roles: ['ADMIN', 'PHYSICIAN'],
      isActive: true,
    });

    await socketAuthMiddleware(socket, mockNext);

    expect(mockNext).toHaveBeenCalledWith(); // No error
    expect(socket.data.roles).toEqual(['ADMIN', 'PHYSICIAN']);
  });

  it('should handle unexpected errors gracefully', async () => {
    const socket = createMockSocket('valid-token');
    mockVerifyToken.mockImplementation(() => {
      throw new Error('Unexpected JWT error');
    });

    await socketAuthMiddleware(socket, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = mockNext.mock.calls[0][0] as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Authentication failed');
  });
});
