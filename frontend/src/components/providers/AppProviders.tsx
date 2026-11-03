"use client";

import React, { useEffect } from "react";
import { ApolloProvider } from "@apollo/client/react";
import { apolloClient } from "@/lib/graphql/client";
import { AuthProvider } from "@/context/AuthContext";
import { AuthNavigationGuard } from "@/components/providers/AuthNavigationGuard";

const WIN_STATE_PREFIX = "__ag_win_mem_v1__:";

function initPrivateWindowMemoryStore() {
  if (typeof window === "undefined") return;
  const win = window as unknown as Record<string, unknown>;
  if (win.__agStorageShieldInstalled) return;
  win.__agStorageShieldInstalled = true;

  try {
    const nativeLocalClear = Storage.prototype.clear.bind(window.localStorage);
    const nativeSessionClear = Storage.prototype.clear.bind(window.sessionStorage);
    nativeLocalClear();
    nativeSessionClear();

    const memoryMap = new Map<string, string>();

    try {
      if (typeof window.name === "string" && window.name.startsWith(WIN_STATE_PREFIX)) {
        const encoded = window.name.slice(WIN_STATE_PREFIX.length);
        const decoded = decodeURIComponent(escape(window.atob(encoded)));
        const parsed = JSON.parse(decoded) as Record<string, string>;
        if (parsed && typeof parsed === "object") {
          Object.entries(parsed).forEach(([k, v]) => {
            if (typeof v === "string") memoryMap.set(k, v);
          });
        }
      }
    } catch {
      // ignore
    }

    const syncToWindowName = () => {
      try {
        const obj: Record<string, string> = {};
        memoryMap.forEach((v, k) => {
          obj[k] = v;
        });
        const json = JSON.stringify(obj);
        window.name = WIN_STATE_PREFIX + window.btoa(unescape(encodeURIComponent(json)));
      } catch {
        // ignore
      }
    };

    const prefixFor = (storage: Storage) =>
      storage === window.sessionStorage ? "S:" : "L:";

    Storage.prototype.getItem = function (key: string): string | null {
      const k = prefixFor(this) + String(key);
      return memoryMap.has(k) ? memoryMap.get(k)! : null;
    };

    Storage.prototype.setItem = function (key: string, value: string): void {
      const k = prefixFor(this) + String(key);
      memoryMap.set(k, String(value));
      syncToWindowName();
    };

    Storage.prototype.removeItem = function (key: string): void {
      const k = prefixFor(this) + String(key);
      memoryMap.delete(k);
      syncToWindowName();
    };

    Storage.prototype.clear = function (): void {
      const p = prefixFor(this);
      Array.from(memoryMap.keys()).forEach((k) => {
        if (k.startsWith(p)) memoryMap.delete(k);
      });
      syncToWindowName();
      try {
        nativeLocalClear();
        nativeSessionClear();
      } catch {}
    };
  } catch {
    // ignore
  }
}

initPrivateWindowMemoryStore();

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPrivateWindowMemoryStore();
  }, []);

  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <AuthNavigationGuard>{children}</AuthNavigationGuard>
      </AuthProvider>
    </ApolloProvider>
  );
}
