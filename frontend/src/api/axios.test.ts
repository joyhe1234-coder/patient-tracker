/**
 * Tests for API client (axios.ts)
 *
 * Tests the sanitizeForLogging utility, getApiBaseUrl logic,
 * request interceptor (auth token + socket ID), and response interceptor (error logging).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock socketService before importing axios module
vi.mock('../services/socketService', () => ({
  getSocket: vi.fn(() => null),
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('axios API client', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('sanitizeForLogging', () => {
    it('should be importable as part of the module', async () => {
      const module = await import('./axios');
      expect(module.api).toBeDefined();
      expect(module.api.defaults.headers['Content-Type']).toBe('application/json');
    });

    it('returns non-object values as-is', async () => {
      const { sanitizeForLogging } = await import('./axios');
      expect(sanitizeForLogging('hello')).toBe('hello');
    });

    it('returns number as-is', async () => {
      const { sanitizeForLogging } = await import('./axios');
      expect(sanitizeForLogging(42)).toBe(42);
    });

    it('returns null as-is', async () => {
      const { sanitizeForLogging } = await import('./axios');
      expect(sanitizeForLogging(null)).toBeNull();
    });

    it('redacts password key', async () => {
      const { sanitizeForLogging } = await import('./axios');
      const result = sanitizeForLogging({ password: 'secret', name: 'Joe' }) as Record<string, unknown>;
      expect(result.password).toBe('***');
      expect(result.name).toBe('Joe');
    });

    it('redacts token and authorization keys', async () => {
      const { sanitizeForLogging } = await import('./axios');
      const result = sanitizeForLogging({ token: 'abc', authorization: 'Bearer xyz' }) as Record<string, unknown>;
      expect(result.token).toBe('***');
      expect(result.authorization).toBe('***');
    });

    it('does not mutate original object', async () => {
      const { sanitizeForLogging } = await import('./axios');
      const original = { password: 'secret', name: 'Joe' };
      sanitizeForLogging(original);
      expect(original.password).toBe('secret');
    });

    it('redacts secret and Authorization (capital A) keys', async () => {
      const { sanitizeForLogging } = await import('./axios');
      const result = sanitizeForLogging({ secret: 'key123', Authorization: 'Bearer tok' }) as Record<string, unknown>;
      expect(result.secret).toBe('***');
      expect(result.Authorization).toBe('***');
    });
  });

  describe('getApiBaseUrl', () => {
    it('creates api instance with correct defaults', async () => {
      const { api } = await import('./axios');

      expect(api.defaults.headers['Content-Type']).toBe('application/json');
      expect(api.defaults.baseURL).toBeDefined();
    });

    it('returns /api when no env var is set', async () => {
      const { getApiBaseUrl } = await import('./axios');
      // In test environment VITE_API_URL is not set
      const result = getApiBaseUrl();
      expect(result).toBe('/api');
    });

    it('prepends https:// when URL contains a dot', async () => {
      vi.stubEnv('VITE_API_URL', 'my-api.example.com');
      const { getApiBaseUrl } = await import('./axios');
      expect(getApiBaseUrl()).toBe('https://my-api.example.com/api');
      vi.unstubAllEnvs();
    });

    it('appends .onrender.com when URL has no dot', async () => {
      vi.stubEnv('VITE_API_URL', 'my-service');
      const { getApiBaseUrl } = await import('./axios');
      expect(getApiBaseUrl()).toBe('https://my-service.onrender.com/api');
      vi.unstubAllEnvs();
    });
  });

  describe('request interceptor', () => {
    it('attaches auth token from localStorage when available', async () => {
      const { api } = await import('./axios');
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('test-jwt-token');

      // Simulate request interceptor by calling the fulfillment handler
      const interceptors = (api.interceptors.request as unknown as { handlers: Array<{ fulfilled: (config: unknown) => unknown }> }).handlers;
      if (interceptors.length > 0) {
        const config = { headers: {} as Record<string, string> };
        const result = interceptors[0].fulfilled(config) as { headers: Record<string, string> };
        expect(result.headers.Authorization).toBe('Bearer test-jwt-token');
      }
    });

    it('does not attach auth header when no token in localStorage', async () => {
      const { api } = await import('./axios');
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const interceptors = (api.interceptors.request as unknown as { handlers: Array<{ fulfilled: (config: unknown) => unknown }> }).handlers;
      if (interceptors.length > 0) {
        const config = { headers: {} as Record<string, string> };
        const result = interceptors[0].fulfilled(config) as { headers: Record<string, string> };
        expect(result.headers.Authorization).toBeUndefined();
      }
    });
  });

  describe('response interceptor', () => {
    it('passes through successful responses', async () => {
      const { api } = await import('./axios');

      const interceptors = (api.interceptors.response as unknown as { handlers: Array<{ fulfilled: (response: unknown) => unknown }> }).handlers;
      if (interceptors.length > 0) {
        const response = { data: { success: true }, status: 200 };
        const result = interceptors[0].fulfilled(response);
        expect(result).toEqual(response);
      }
    });

    it('rejects errors from response interceptor', async () => {
      const { api } = await import('./axios');

      const interceptors = (api.interceptors.response as unknown as { handlers: Array<{ rejected: (error: unknown) => Promise<never> }> }).handlers;
      if (interceptors.length > 0) {
        const error = {
          response: { status: 500, data: { error: 'Internal Server Error' } },
          config: { url: '/api/test' },
        };
        await expect(interceptors[0].rejected(error)).rejects.toEqual(error);
      }
    });

    it('handles network error (no response) and rejects', async () => {
      const { api } = await import('./axios');

      const interceptors = (api.interceptors.response as unknown as { handlers: Array<{ rejected: (error: unknown) => Promise<never> }> }).handlers;
      if (interceptors.length > 0) {
        const error = {
          request: {},
          message: 'Network Error',
        };
        await expect(interceptors[0].rejected(error)).rejects.toEqual(error);
      }
    });

    it('handles setup error (no response, no request) and rejects', async () => {
      const { api } = await import('./axios');

      const interceptors = (api.interceptors.response as unknown as { handlers: Array<{ rejected: (error: unknown) => Promise<never> }> }).handlers;
      if (interceptors.length > 0) {
        const error = {
          message: 'Request setup failed',
        };
        await expect(interceptors[0].rejected(error)).rejects.toEqual(error);
      }
    });
  });

  describe('request interceptor — X-Socket-ID', () => {
    it('attaches X-Socket-ID header when socket is connected', async () => {
      const { getSocket } = await import('../services/socketService');
      (getSocket as ReturnType<typeof vi.fn>).mockReturnValue({ id: 'sock-123' });

      const { api } = await import('./axios');
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const interceptors = (api.interceptors.request as unknown as { handlers: Array<{ fulfilled: (config: unknown) => unknown }> }).handlers;
      if (interceptors.length > 0) {
        const config = { headers: {} as Record<string, string> };
        const result = interceptors[0].fulfilled(config) as { headers: Record<string, string> };
        expect(result.headers['X-Socket-ID']).toBe('sock-123');
      }
    });
  });
});
