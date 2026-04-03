import ky from 'ky';
import { storage } from './storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const api = ky.create({
  prefixUrl: `${API_BASE_URL}/api/v1`,
  headers: { 'expo-origin': 'moneylens://' },
  hooks: {
    beforeRequest: [
      async (request) => {
        const token = await storage.getToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        if (response.status === 401) {
          await storage.deleteToken();
          // Lazy import to avoid circular dependency with the store
          const { useAuthStore } = await import('@/stores/auth');
          useAuthStore.getState().clearAuth();
        }
        return response;
      },
    ],
  },
});
