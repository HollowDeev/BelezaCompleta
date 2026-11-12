import { beforeEach } from "vitest";

// Memory storage polyfill for localStorage in Node runtime
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

export const memoryStorage = new MemoryStorage();

// Window & Event emitter polyfill for syncBus and localStore
class SimpleWindowEmitter {
  private listeners: Record<string, Function[]> = {};

  addEventListener(type: string, listener: Function): void {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: Function): void {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
  }

  dispatchEvent(event: any): boolean {
    const list = this.listeners[event.type] || [];
    for (const l of list) l(event);
    return true;
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}

export const fakeWindow = Object.assign(new SimpleWindowEmitter(), {
  localStorage: memoryStorage,
  location: { href: "http://localhost:3000" },
});

(globalThis as any).window = fakeWindow;
(globalThis as any).localStorage = memoryStorage;
(globalThis as any).CustomEvent = class CustomEvent {
  constructor(public type: string, public params?: any) {
    this.detail = params?.detail;
  }
  detail: any;
};

// Reset store and event listeners before each test to guarantee complete test isolation
beforeEach(() => {
  memoryStorage.clear();
  fakeWindow.removeAllListeners();
});
