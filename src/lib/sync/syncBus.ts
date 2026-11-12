// src/lib/sync/syncBus.ts
// Barramento de sincronização em tempo real (Cross-tab & Local Fallback)

export type GlaicySyncEventType =
  | "triage_created"
  | "triage_saved"
  | "triage_approved"
  | "pre_reservation_saved"
  | "proposal_saved"
  | "proposal_approved"
  | "appointment_saved"
  | "client_saved";

export interface GlaicySyncPayload {
  type: GlaicySyncEventType;
  id?: string;
  timestamp: number;
}

const CHANNEL_NAME = "glaicy_realtime_bus";

export function broadcastSync(type: GlaicySyncEventType, id?: string) {
  if (typeof window === "undefined") return;

  const payload: GlaicySyncPayload = {
    type,
    id,
    timestamp: Date.now(),
  };

  // 1. BroadcastChannel (comunicação entre abas instantânea sem rede)
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bc.postMessage(payload);
      bc.close();
    }
  } catch (e) {
    // fallback seguro
  }

  // 2. CustomEvent na mesma aba
  try {
    window.dispatchEvent(new CustomEvent("glaicy_realtime_sync", { detail: payload }));
  } catch (e) {
    // fallback seguro
  }

  // 3. LocalStorage trigger para navegadores antigos
  try {
    localStorage.setItem("glaicy_sync_ping", JSON.stringify(payload));
  } catch (e) {
    // fallback seguro
  }
}

export function subscribeToSync(callback: (payload: GlaicySyncPayload) => void): () => void {
  if (typeof window === "undefined") return () => {};

  let bc: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data) {
          callback(event.data);
        }
      };
    }
  } catch (e) {
    // fallback
  }

  const handleCustomEvent = (e: Event) => {
    const ce = e as CustomEvent<GlaicySyncPayload>;
    if (ce.detail) {
      callback(ce.detail);
    }
  };
  window.addEventListener("glaicy_realtime_sync", handleCustomEvent);

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === "glaicy_sync_ping" && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed);
      } catch (err) {
        // ignore
      }
    }
  };
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    if (bc) {
      bc.close();
    }
    window.removeEventListener("glaicy_realtime_sync", handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
