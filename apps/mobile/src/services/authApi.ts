import axios from 'axios';
import { storage } from './storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Axios client for Better Auth organization endpoints (`/api/auth/organization/*`).
 * Automatically injects the Bearer token from secure storage.
 */
export const authApi = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`,
  headers: { 'Content-Type': 'application/json', 'expo-origin': 'moneylens://' },
});

authApi.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
