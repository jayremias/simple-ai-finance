import ky from 'ky';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const authClient = ky.create({
  prefixUrl: `${API_BASE_URL}/api/auth`,
  headers: { 'expo-origin': 'moneylens://' },
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

function extractToken(data: AuthResponse, headers: Headers): string {
  // Better Auth v1.5 returns token in body; bearer plugin also sets set-auth-token header
  const token = data.token ?? headers.get('set-auth-token') ?? undefined;
  if (!token) throw new Error('No token in response');
  return token;
}

export const authService = {
  async signIn(email: string, password: string): Promise<SignInResult> {
    const res = await authClient.post('sign-in/email', { json: { email, password } });
    const data = await res.json<AuthResponse>();
    return { token: extractToken(data, res.headers), user: data.user };
  },

  async signUp(name: string, email: string, password: string): Promise<SignInResult> {
    const res = await authClient.post('sign-up/email', { json: { name, email, password } });
    const data = await res.json<AuthResponse>();
    return { token: extractToken(data, res.headers), user: data.user };
  },

  async signOut(token: string): Promise<void> {
    await authClient.post('sign-out', {
      json: {},
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
