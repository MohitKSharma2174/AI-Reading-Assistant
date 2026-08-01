'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  login as apiLogin, 
  signup as apiSignup, 
  getCurrentUser, 
  getToken, 
  removeToken, 
  User 
} from '../lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  loginUser: (email: string, pass: string) => Promise<void>;
  signupUser: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  // Load user session on mount
  useEffect(() => {
    async function loadUserSession() {
      const token = getToken();
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const u = await getCurrentUser();
        setUser(u);
        setIsAuthenticated(true);
      } catch (_) {
        removeToken();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }

    loadUserSession();
  }, []);

  const loginUser = async (email: string, pass: string) => {
    await apiLogin(email, pass);
    try {
      const u = await getCurrentUser();
      setUser(u);
      setIsAuthenticated(true);
    } catch (_) {
      // Fallback user object if /me fails
      const fallbackUser: User = {
        id: 1,
        email,
        created_at: new Date().toISOString(),
      };
      setUser(fallbackUser);
      setIsAuthenticated(true);
    }
  };

  const signupUser = async (email: string, pass: string) => {
    await apiSignup(email, pass);
    // Automatically log in after successful signup
    await loginUser(email, pass);
  };

  const logout = () => {
    removeToken();
    setUser(null);
    setIsAuthenticated(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        loginUser,
        signupUser,
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
