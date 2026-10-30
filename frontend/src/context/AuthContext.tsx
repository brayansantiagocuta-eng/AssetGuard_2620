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
  token?: string;
}

interface ErrorResponse {
  message?: string;
  error?: string;
}

const SESSION_USER_KEY = "assetguard_current_user";
const TAB_USER_KEY = "assetguard_tab_user";
const TAB_EMAIL_KEY = "assetguard_tab_email";
const TAB_TOKEN_KEY = "assetguard_tab_token";
const SESSION_TOKEN_KEY = "assetguard_session_token";
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
  // Inicializa el usuario desde la sesión de esta pestaña específica (o fallback local) para que cada pestaña conserve su propia sesión al recargar
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      // 1. Prioridad: la sesión guardada en esta pestaña específica (sessionStorage)
      const tabSaved = sessionStorage.getItem(TAB_USER_KEY);
      if (tabSaved) {
        const parsed = JSON.parse(tabSaved);
        if (isAuthUser(parsed)) return parsed;
      }
      // 2. Almacenamiento local si la pestaña es nueva
      const localSaved = localStorage.getItem(SESSION_USER_KEY);
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        if (isAuthUser(parsed)) {
          // Asigna a esta pestaña para que no dependa de otras pestañas en el futuro
          sessionStorage.setItem(TAB_USER_KEY, localSaved);
          sessionStorage.setItem(TAB_EMAIL_KEY, parsed.email);
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    let currentTabUser: AuthUser | null = null;
    let tabToken: string | null = null;
    if (typeof window !== "undefined") {
      try {
        const tabSaved = sessionStorage.getItem(TAB_USER_KEY);
        if (tabSaved) {
          const parsed = JSON.parse(tabSaved);
          if (isAuthUser(parsed)) currentTabUser = parsed;
        }
        tabToken = sessionStorage.getItem(TAB_TOKEN_KEY) || localStorage.getItem(SESSION_TOKEN_KEY);
      } catch {}
    }

    try {
      const response = await fetch(`/api/auth/me?_t=${Date.now()}`, {
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          ...(tabToken ? { Authorization: `Bearer ${tabToken}`, "X-Session-Token": tabToken } : {}),
        },
      });

      if (response.status === 401) {
        try {
          localStorage.removeItem(SESSION_USER_KEY);
          sessionStorage.removeItem(TAB_USER_KEY);
          localStorage.removeItem(SESSION_TOKEN_KEY);
          sessionStorage.removeItem(TAB_TOKEN_KEY);
        } catch {}
        setUser(null);
        setAuthError(null);
        return false;
      }

      if (!response.ok) {
        if (currentTabUser) {
          setUser(currentTabUser);
          return true;
        }
        throw new Error(await getErrorMessage(response, "No se pudo validar la sesión."));
      }

      const body = (await response.json()) as AuthResponse;
      if (!isAuthUser(body.user)) {
        if (currentTabUser) {
          setUser(currentTabUser);
          return true;
        }
        throw new Error("El servidor devolvió información de usuario no válida.");
      }

      setUser(body.user);
      try {
        sessionStorage.setItem(TAB_USER_KEY, JSON.stringify(body.user));
        sessionStorage.setItem(TAB_EMAIL_KEY, body.user.email);
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(body.user));
        if (body.token) {
          sessionStorage.setItem(TAB_TOKEN_KEY, body.token);
          localStorage.setItem(SESSION_TOKEN_KEY, body.token);
        }
      } catch {}
      setAuthError(null);
      return true;
    } catch (error) {
      if (currentTabUser) {
        setUser(currentTabUser);
        return true;
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

  // Sincroniza el correo de la sesión actual en el almacenamiento privado de esta pestaña
  useEffect(() => {
    if (user?.email) {
      try {
        sessionStorage.setItem(TAB_EMAIL_KEY, user.email);
        const emailLower = user.email.toLowerCase();
        const isRemembered = localStorage.getItem(`assetguard_remember_${emailLower}`) === "true";
        if (isRemembered) {
          sessionStorage.setItem("assetguard_tab_remember", "true");
        }
      } catch {
        // ignore
      }
    }
  }, [user]);

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
        sessionStorage.setItem(TAB_USER_KEY, JSON.stringify(body.user));
        sessionStorage.setItem(TAB_EMAIL_KEY, email.trim());
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(body.user));
        if (body.token) {
          sessionStorage.setItem(TAB_TOKEN_KEY, body.token);
          localStorage.setItem(SESSION_TOKEN_KEY, body.token);
        }
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
      let tabToken: string | null = null;
      try {
        tabToken = sessionStorage.getItem(TAB_TOKEN_KEY) || localStorage.getItem(SESSION_TOKEN_KEY);

        // Aislar y preservar el correo del usuario que cerró sesión específicamente en esta pestaña
        const currentEmail = user?.email || (() => {
          try {
            const saved = sessionStorage.getItem(TAB_USER_KEY);
            return saved ? JSON.parse(saved).email : null;
          } catch {
            return null;
          }
        })();

        if (currentEmail) {
          const emailClean = currentEmail.trim();
          const emailLower = emailClean.toLowerCase();
          sessionStorage.setItem(TAB_EMAIL_KEY, emailClean);

          const wasTabRemembered = sessionStorage.getItem("assetguard_tab_remember") === "true";
          const wasGlobalRemembered = localStorage.getItem(`assetguard_remember_${emailLower}`) === "true";
          if (wasTabRemembered || wasGlobalRemembered) {
            sessionStorage.setItem("assetguard_tab_remember", "true");
          }
        }

        sessionStorage.removeItem(TAB_USER_KEY);
        localStorage.removeItem(SESSION_USER_KEY);
        sessionStorage.removeItem(TAB_TOKEN_KEY);
        localStorage.removeItem(SESSION_TOKEN_KEY);
      } catch {
        // ignore
      }
      setUser(null);

      const response = await fetch(`/api/auth/logout?_t=${Date.now()}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Cache-Control": "no-cache, no-store",
          ...(tabToken ? { Authorization: `Bearer ${tabToken}`, "X-Session-Token": tabToken } : {}),
        },
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
