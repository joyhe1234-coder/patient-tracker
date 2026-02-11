import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { getApiErrorMessage } from '../apiError';

describe('getApiErrorMessage', () => {
  it('extracts message from Axios error response', () => {
    const error = new AxiosError('Request failed');
    error.response = {
      data: { error: { code: 'DUPLICATE_ROW', message: 'Duplicate row exists for this patient' } },
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: {} as any,
    };
    expect(getApiErrorMessage(error)).toBe('Duplicate row exists for this patient');
  });

  it('extracts message from Axios-shaped plain object', () => {
    const error = {
      response: {
        data: { error: { message: 'Server validation failed' } },
      },
    };
    expect(getApiErrorMessage(error)).toBe('Server validation failed');
  });

  it('falls back to error.message when no Axios response', () => {
    const error = new Error('Network Error');
    expect(getApiErrorMessage(error)).toBe('Network Error');
  });

  it('uses custom fallback when no message available', () => {
    expect(getApiErrorMessage({}, 'Failed to create row')).toBe('Failed to create row');
  });

  it('uses default fallback for plain objects without response', () => {
    expect(getApiErrorMessage({})).toBe('An unexpected error occurred');
  });

  it('handles null gracefully', () => {
    expect(getApiErrorMessage(null)).toBe('An unexpected error occurred');
  });

  it('handles undefined gracefully', () => {
    expect(getApiErrorMessage(undefined)).toBe('An unexpected error occurred');
  });

  it('handles Axios error with empty response data', () => {
    const error = new AxiosError('Request failed');
    error.response = {
      data: {},
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: {} as any,
    };
    expect(getApiErrorMessage(error)).toBe('Request failed');
  });
});
