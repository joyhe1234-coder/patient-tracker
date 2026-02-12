import axios from 'axios';
import { getSocket } from '../services/socketService';
import { logger } from '../utils/logger';

/**
 * Sanitize data before logging to prevent sensitive values from appearing in logs.
 * Creates a shallow copy — the original data is never modified.
 */
function sanitizeForLogging(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const sanitized = { ...data } as Record<string, unknown>;
  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'Authorization'];
  for (const key of sensitiveKeys) {
    if (key in sanitized) sanitized[key] = '***';
  }
  return sanitized;
}

// Use environment variable for API URL in production, fallback to /api for local dev
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api';

  // If URL doesn't contain a dot, it's likely just the service name - append .onrender.com
  const host = envUrl.includes('.') ? envUrl : `${envUrl}.onrender.com`;
  return `https://${host}/api`;
};

const apiBaseUrl = getApiBaseUrl();

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      logger.error('API Error:', {
        url: error.config?.url,
        status: error.response.status,
        data: sanitizeForLogging(error.response.data),
      });
    } else if (error.request) {
      // Request made but no response received
      logger.error('Network Error:', error.message);
    } else {
      // Something else happened
      logger.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Request interceptor for auth token and Socket ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Include Socket.IO ID so backend can exclude originating socket from broadcasts
    const socket = getSocket();
    if (socket?.id) {
      config.headers['X-Socket-ID'] = socket.id;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
