"use client";

import React, { useEffect } from "react";
import { ApolloProvider } from "@apollo/client/react";
import { apolloClient } from "@/lib/graphql/client";
import { AuthProvider } from "@/context/AuthContext";
import { AuthNavigationGuard } from "@/components/providers/AuthNavigationGuard";
import { getSyncChannel, currentTabId } from "@/lib/crossTabSync";

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
    let isRemoteUpdate = false;
    const syncChannel = getSyncChannel();

    if (syncChannel) {
      syncChannel.addEventListener("message", (event: MessageEvent) => {
        const msg = event.data;
        if (!msg || typeof msg !== "object") return;
        if (msg.sourceTabId === currentTabId) return;

        if (msg.type === "STORAGE_SYNC" && msg.payload) {
          const { action, key, value, prefix } = msg.payload;
          isRemoteUpdate = true;
          try {
            if (action === "SET" && key) {
              memoryMap.set(key, String(value));
              syncToWindowName();
            } else if (action === "REMOVE" && key) {
              memoryMap.delete(key);
              syncToWindowName();
            } else if (action === "CLEAR" && prefix) {
              Array.from(memoryMap.keys()).forEach((k) => {
                if (k.startsWith(prefix)) memoryMap.delete(k);
              });
              syncToWindowName();
            }
          } finally {
            isRemoteUpdate = false;
          }
        } else if (msg.type === "STORAGE_SNAPSHOT_REQ") {
          const snapshot: Record<string, string> = {};
          memoryMap.forEach((v, k) => {
            snapshot[k] = v;
          });
          if (Object.keys(snapshot).length > 0) {
            try {
              syncChannel.postMessage({
                type: "STORAGE_SNAPSHOT_RES",
                payload: snapshot,
                targetTabId: msg.sourceTabId,
                sourceTabId: currentTabId,
                timestamp: Date.now(),
              });
            } catch {}
          }
        } else if (msg.type === "STORAGE_SNAPSHOT_RES" && msg.targetTabId === currentTabId) {
          const snapshot = msg.payload;
          if (snapshot && typeof snapshot === "object") {
            isRemoteUpdate = true;
            try {
              Object.entries(snapshot).forEach(([k, v]) => {
                if (typeof v === "string" && !memoryMap.has(k)) {
                  memoryMap.set(k, v);
                }
              });
              syncToWindowName();
            } finally {
              isRemoteUpdate = false;
            }
          }
        }
      });

      try {
        syncChannel.postMessage({
          type: "STORAGE_SNAPSHOT_REQ",
          sourceTabId: currentTabId,
          timestamp: Date.now(),
        });
      } catch {}
    }

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
      if (!isRemoteUpdate && syncChannel) {
        try {
          syncChannel.postMessage({
            type: "STORAGE_SYNC",
            payload: { action: "SET", key: k, value: String(value) },
            sourceTabId: currentTabId,
            timestamp: Date.now(),
          });
        } catch {}
      }
    };

    Storage.prototype.removeItem = function (key: string): void {
      const k = prefixFor(this) + String(key);
      memoryMap.delete(k);
      syncToWindowName();
      if (!isRemoteUpdate && syncChannel) {
        try {
          syncChannel.postMessage({
            type: "STORAGE_SYNC",
            payload: { action: "REMOVE", key: k },
            sourceTabId: currentTabId,
            timestamp: Date.now(),
          });
        } catch {}
      }
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
      if (!isRemoteUpdate && syncChannel) {
        try {
          syncChannel.postMessage({
            type: "STORAGE_SYNC",
            payload: { action: "CLEAR", prefix: p },
            sourceTabId: currentTabId,
            timestamp: Date.now(),
          });
        } catch {}
      }
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
