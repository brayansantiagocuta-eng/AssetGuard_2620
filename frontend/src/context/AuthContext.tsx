"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type UserRole = "ADMIN" | "INSPECTOR" | "TECHNICIAN";
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  refreshSession: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
}

interface AuthResponse {
  user: AuthUser;
}

interface ErrorResponse {
  message?: string;
  error?: string;
}

const SESSION_USER_KEY = "assetguard_current_user";
const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "number" &&
    typeof user.fullName === "string" &&
    typeof user.email === "string" &&
    (user.role === "ADMIN" || user.role === "INSPECTOR" || user.role === "TECHNICIAN") &&
    (user.status === "ACTIVE" || user.status === "INACTIVE")
  );
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as ErrorResponse;
    return body.message || body.error || fallback;
  } catch {
    return fallback;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Inicializa el usuario desde el almacenamiento local seguro para evitar cambios de cuenta o destellos al recargar
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(SESSION_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isAuthUser(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      // Timestamp para evitar cualquier respuesta cacheada por proxies o navegador
      const response = await fetch(`/api/auth/me?_t=${Date.now()}`, {
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      });

      if (response.status === 401) {
        try {
          localStorage.removeItem(SESSION_USER_KEY);
        } catch {
          // ignore
        }
        setUser(null);
        setAuthError(null);
        return false;
      }

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "No se pudo validar la sesión."));
      }

      const body = (await response.json()) as AuthResponse;
      if (!isAuthUser(body.user)) {
        throw new Error("El servidor devolvió información de usuario no válida.");
      }

      setUser(body.user);
      try {
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(body.user));
      } catch {
        // ignore
      }
      setAuthError(null);
      return true;
    } catch (error) {
      // Si hay error de conexión puntual, no borramos el usuario local de inmediato para evitar que cambie o se pierda la sesión
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(SESSION_USER_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (isAuthUser(parsed)) {
              setUser(parsed);
              return true;
            }
          }
        } catch {
          // ignore
        }
      }

      setAuthError(
        error instanceof Error
          ? error.message
          : "No se pudo conectar con el servidor de autenticación."
      );
      return false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    void Promise.resolve()
      .then(refreshSession)
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [refreshSession]);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await fetch(`/api/auth/login?_t=${Date.now()}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: await getErrorMessage(response, "No se pudo iniciar sesión."),
        };
      }

      const body = (await response.json()) as AuthResponse;
      if (!isAuthUser(body.user)) {
        return { success: false, error: "El servidor devolvió información de usuario no válida." };
      }

      setUser(body.user);
      try {
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(body.user));
      } catch {
        // ignore
      }
      setAuthError(null);
      return { success: true };
    } catch {
      return {
        success: false,
        error: "No se pudo conectar con el servidor. Verifique que el backend esté iniciado.",
      };
    }
  };

  const logout = async (): Promise<AuthResult> => {
    try {
      try {
        localStorage.removeItem(SESSION_USER_KEY);
      } catch {
        // ignore
      }
      setUser(null);

      const response = await fetch(`/api/auth/logout?_t=${Date.now()}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Cache-Control": "no-cache, no-store" },
      });

      if (!response.ok) {
        return {
          success: false,
          error: await getErrorMessage(response, "No se pudo cerrar la sesión en el servidor."),
        };
      }

      setAuthError(null);
      return { success: true };
    } catch {
      return {
        success: false,
        error: "No se pudo conectar con el servidor para cerrar la sesión.",
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isAuthenticated: !!user,
        isLoading,
        authError,
        refreshSession,
        login,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
