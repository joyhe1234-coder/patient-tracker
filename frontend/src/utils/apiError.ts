import { AxiosError } from 'axios';

export function getApiErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (error instanceof AxiosError || (error && typeof error === 'object' && 'response' in error)) {
    const axiosErr = error as AxiosError<{ error?: { message?: string } }>;
    const msg = axiosErr.response?.data?.error?.message;
    if (msg) return msg;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
