import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/endpoints';
import type { JwtPayload } from '../types';
import { Role } from '../types';

function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

interface AuthContextValue {
  token: string | null;
  claims: JwtPayload | null;
  mustChangePassword: boolean;
  login: (username: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  logout: () => void;
  setMustChangePassword: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('accessToken'));
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const claims = useMemo(() => (token ? decodeJwt(token) : null), [token]);

  const login = async (username: string, password: string) => {
    const { accessToken, mustChangePassword } = await authApi.login(username, password);
    localStorage.setItem('accessToken', accessToken);
    setToken(accessToken);
    setMustChangePassword(mustChangePassword);
    return { mustChangePassword };
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{ token, claims, mustChangePassword, login, logout, setMustChangePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function hasAnyRole(role: Role | undefined, allowed: Role[]) {
  return !!role && allowed.includes(role);
}

export { Role };
