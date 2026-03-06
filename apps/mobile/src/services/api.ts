import axios from 'axios';
import { storage } from './storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Lazy import to avoid circular dependency with the store
api.interceptors.response.use(
  (res) => res,
  async (err: unknown) => {
    if (
      err &&
      typeof err === 'object' &&
      'response' in err &&
      (err as { response?: { status?: number } }).response?.status === 401
    ) {
      await storage.deleteToken();
      const { useAuthStore } = await import('@/stores/auth');
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(err);
  }
);
