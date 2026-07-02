'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type User = {
  email: string;
  role: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<any>;
  signup: (name: string, email: string, password: string, role: string, phone?: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const decodeToken = (token: string): User => {
  const [, payload] = token.split('.');
  const decoded = JSON.parse(atob(payload));
  return {
    email: decoded.sub || '',
    role: decoded.role || 'citizen',
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem('urbanpulse_token');
    if (token) {
      try {
        setUser(decodeToken(token));
      } catch {
        window.localStorage.removeItem('urbanpulse_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login({ email, password });
    window.localStorage.setItem('urbanpulse_token', data.access_token);
    setUser(decodeToken(data.access_token));
  };

  const loginWithGoogle = async (credential: string) => {
    const data = await api.googleLogin(credential);
    window.localStorage.setItem('urbanpulse_token', data.access_token);
    setUser(decodeToken(data.access_token));
    return data; // return full response so callers can use role, is_new_user, etc.
  };

  const signup = async (name: string, email: string, password: string, role: string, phone?: string) => {
    await api.signup({ name, email, password, role, phone });
    await login(email, password);
  };

  const logout = () => {
    window.localStorage.removeItem('urbanpulse_token');
    setUser(null);
    router.push('/auth');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        loginWithGoogle,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
