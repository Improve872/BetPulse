"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  apiFetch,
  getCurrentUser,
  resetCsrf,
  type AuthResponse,
  type User,
} from "@/lib/api";

export type RegisterInput = {
  displayName: string;
  email: string;
  password: string;
  acceptsTerms: boolean;
  isAdult: boolean;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const nextUser = await getCurrentUser();
    setUser(nextUser);
  }, []);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((nextUser) => {
        if (active) {
          setUser(nextUser);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(response.user);
    return response.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const response = await apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch<void>("/api/auth/logout", { method: "POST" });
    } finally {
      resetCsrf();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
