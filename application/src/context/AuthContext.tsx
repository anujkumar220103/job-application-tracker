"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { API_BASE_URL } from "@/lib/apiBase";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (nextToken: string, nextUser: AuthUser) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const STORAGE_KEYS = {
  token: "token",
  user: "user",
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  login: () => {},
  logout: () => {},
  refreshSession: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback((nextToken: string | null, nextUser: AuthUser | null) => {
    if (typeof window === "undefined") return;

    if (nextToken) {
      localStorage.setItem(STORAGE_KEYS.token, nextToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.token);
    }

    if (nextUser) {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.user);
    }
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    persistSession(null, null);
  }, [persistSession]);

  const login = useCallback(
    (nextToken: string, nextUser: AuthUser) => {
      setToken(nextToken);
      setUser(nextUser);
      persistSession(nextToken, nextUser);
    },
    [persistSession],
  );

  const refreshSession = useCallback(async () => {
    if (typeof window === "undefined") return;

    const storedToken = localStorage.getItem(STORAGE_KEYS.token);
    if (!storedToken) {
      clearSession();
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("Unauthorized");
      }

      const payload = await res.json();
      // Standard envelope: { data: { user } }
      const nextUser = (payload?.data?.user ?? payload?.user) as AuthUser | undefined;

      if (!nextUser) {
        throw new Error("Invalid session");
      }

      setToken(storedToken);
      setUser(nextUser);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        loading,
        login,
        logout: clearSession,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
