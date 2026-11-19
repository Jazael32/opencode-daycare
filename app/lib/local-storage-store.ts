// Shared localStorage snapshot store for useSyncExternalStore.
//
// Keeps the snapshot identity stable between reads (same raw value → same
// parsed value) and centralizes the guards for blocked/unavailable storage.
export interface LocalStorageStore<T> {
  getSnapshot(): T;
  notify(): void;
  subscribe(callback: () => void): () => void;
  write(value: T): void;
}

export function createLocalStorageStore<T>(
  key: string,
  eventName: string,
  parse: (raw: string | null) => T,
): LocalStorageStore<T> {
  // Stable value for SSR and for "no stored data".
  const empty = parse(null);
  let snapshotRaw: string | null | undefined; // undefined = never read
  let snapshot = empty;

  function readRaw(): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      // Accessing localStorage can throw when the browser blocks storage.
      return null;
    }
  }

  function getSnapshot(): T {
    if (typeof window === "undefined") {
      return empty;
    }

    const raw = readRaw();
    if (raw === snapshotRaw) {
      return snapshot;
    }

    snapshotRaw = raw;
    snapshot = parse(raw);
    return snapshot;
  }

  function write(value: T): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Persistence is best-effort.
    }
  }

  function notify(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(eventName));
    }
  }

  function subscribe(callback: () => void): () => void {
    window.addEventListener(eventName, callback);
    window.addEventListener("storage", callback);
    return () => {
      window.removeEventListener(eventName, callback);
      window.removeEventListener("storage", callback);
    };
  }

  return { getSnapshot, notify, subscribe, write };
}
