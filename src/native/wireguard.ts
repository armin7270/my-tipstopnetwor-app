/**
 * Typed wrapper around the Android-only `window.ObsidianNative` bridge.
 *
 * The bridge is injected by `NativeBridge.java` and drives the official
 * WireGuard userspace engine through `android.net.VpnService`. In a browser
 * (or on iOS) `available` is `false` and the UI falls back to the simulator.
 */

export interface WgConfig {
  id: string;
  name: string;
  endpoint: string;
}

export type WgState = 'down' | 'connecting' | 'up' | 'error';

export interface WgStatus {
  available: boolean;
  state: WgState;
  tunnel: string | null;
  rx: number;
  tx: number;
  error: string | null;
  selected: string | null;
  version?: string;
}

export interface ImportResult {
  ok: boolean;
  id?: string;
  name?: string;
  endpoint?: string;
  error?: string;
}

interface NativeApi {
  status(): string;
  listConfigs(): string;
  importConfig(name: string, text: string): string;
  deleteConfig(id: string): string;
  selectConfig(id: string): string;
  connect(id: string): string;
  disconnect(): string;
  getConfig(id: string): string;
}

declare global {
  interface Window {
    ObsidianNative?: NativeApi;
    __obsidianVpnEvent?: () => void;
  }
}

function api(): NativeApi | null {
  if (typeof window === 'undefined') return null;
  return window.ObsidianNative ?? null;
}

function parse<T>(raw: string | undefined | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const wireguard = {
  get available(): boolean {
    return api() !== null;
  },

  status(): WgStatus | null {
    const bridge = api();
    if (!bridge) return null;
    try {
      return parse<WgStatus>(bridge.status());
    } catch {
      return null;
    }
  },

  configs(): WgConfig[] {
    const bridge = api();
    if (!bridge) return [];
    try {
      const list = parse<WgConfig[]>(bridge.listConfigs());
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  importConfig(name: string, text: string): ImportResult {
    const bridge = api();
    if (!bridge) return { ok: false, error: 'Native VPN is only available in the Android app' };
    try {
      return parse<ImportResult>(bridge.importConfig(name, text)) ?? { ok: false, error: 'Bridge error' };
    } catch {
      return { ok: false, error: 'Bridge error' };
    }
  },

  remove(id: string): boolean {
    const bridge = api();
    if (!bridge) return false;
    try {
      return parse<{ ok: boolean }>(bridge.deleteConfig(id))?.ok === true;
    } catch {
      return false;
    }
  },

  select(id: string): void {
    try {
      api()?.selectConfig(id);
    } catch {
      /* ignore */
    }
  },

  connect(id: string): void {
    try {
      api()?.connect(id);
    } catch {
      /* ignore */
    }
  },

  disconnect(): void {
    try {
      api()?.disconnect();
    } catch {
      /* ignore */
    }
  },

  configText(id: string): string | null {
    try {
      const result = parse<{ ok: boolean; text?: string }>(api()?.getConfig(id));
      return result?.ok && typeof result.text === 'string' ? result.text : null;
    } catch {
      return null;
    }
  },

  onEvent(handler: () => void): () => void {
    if (typeof window === 'undefined' || !api()) return () => undefined;
    window.__obsidianVpnEvent = handler;
    return () => {
      if (window.__obsidianVpnEvent === handler) delete window.__obsidianVpnEvent;
    };
  },
};
