import axios, { type AxiosResponse } from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const authClient = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`,
  headers: { 'Content-Type': 'application/json', 'expo-origin': 'moneylens://' },
});

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface SignInResult {
  token: string;
  user: AuthUser;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

function extractToken(res: AxiosResponse<AuthResponse>): string {
  // Better Auth v1.5 returns token in body; bearer plugin also sets set-auth-token header
  const token = res.data.token ?? (res.headers['set-auth-token'] as string | undefined);
  if (!token) throw new Error('No token in response');
  return token;
}

export const authService = {
  async signIn(email: string, password: string): Promise<SignInResult> {
    const res = await authClient.post<AuthResponse>('/sign-in/email', { email, password });
    return { token: extractToken(res), user: res.data.user };
  },

  async signUp(name: string, email: string, password: string): Promise<SignInResult> {
    const res = await authClient.post<AuthResponse>('/sign-up/email', { name, email, password });
    return { token: extractToken(res), user: res.data.user };
  },

  async signOut(token: string): Promise<void> {
    await authClient.post(
      '/sign-out',
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },
};
