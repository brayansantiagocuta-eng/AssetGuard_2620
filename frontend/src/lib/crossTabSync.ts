"use client";

export type SyncEventType =
  | "LOANS_SYNC"
  | "INVENTORY_SYNC"
  | "USERS_SYNC"
  | "AUDIT_SYNC"
  | "CRON_SYNC"
  | "STORAGE_SYNC"
  | "STORAGE_SNAPSHOT_REQ"
  | "STORAGE_SNAPSHOT_RES"
  | "DASHBOARD_SYNC";

export interface SyncMessage<T = unknown> {
  type: SyncEventType;
  payload?: T;
  sourceTabId: string;
  targetTabId?: string;
  timestamp: number;
}

export const SYNC_CHANNEL_NAME = "assetguard_cross_tab_channel";

export const currentTabId =
  typeof window !== "undefined"
    ? `${Math.random().toString(36).slice(2, 9)}_${Date.now()}`
    : "ssr";

let sharedChannel: BroadcastChannel | null = null;
const listeners = new Set<(msg: SyncMessage) => void>();

export function getSyncChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (!sharedChannel) {
    try {
      sharedChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      sharedChannel.onmessage = (event: MessageEvent<SyncMessage>) => {
        if (!event.data || typeof event.data !== "object") return;
        // Ignorar eventos originados por la misma pestaña
        if (event.data.sourceTabId === currentTabId) return;

        listeners.forEach((fn) => {
          try {
            fn(event.data);
          } catch (err) {
            console.error("[AssetGuard Sync] Error en listener:", err);
          }
        });
      };
    } catch (e) {
      console.warn("[AssetGuard Sync] BroadcastChannel no disponible:", e);
      sharedChannel = null;
    }
  }
  return sharedChannel;
}

/**
 * Emite un evento a todas las demás pestañas abiertas en tiempo real.
 */
export function broadcastSyncEvent<T = unknown>(type: SyncEventType, payload?: T): void {
  const channel = getSyncChannel();
  const message: SyncMessage<T> = {
    type,
    payload,
    sourceTabId: currentTabId,
    timestamp: Date.now(),
  };

  if (channel) {
    try {
      channel.postMessage(message);
    } catch (err) {
      console.error("[AssetGuard Sync] Error al emitir mensaje:", err);
    }
  }

  // Notificar también a los componentes de la misma pestaña vía CustomEvent
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent(`assetguard:sync:${type}`, { detail: payload })
      );
    } catch {
      // ignore
    }
  }
}

/**
 * Suscribe un componente a eventos emitidos por otras pestañas.
 * Retorna la función para cancelar la suscripción (clean-up en useEffect).
 */
export function subscribeToSync<T = unknown>(
  type: SyncEventType | "*",
  callback: (payload: T | undefined, fullMessage: SyncMessage<T>) => void
): () => void {
  const channel = getSyncChannel();
  if (!channel) return () => {};

  const handler = (msg: SyncMessage) => {
    if (type === "*" || msg.type === type) {
      callback(msg.payload as T | undefined, msg as SyncMessage<T>);
    }
  };

  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}
