import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useState replacement that persists value in sessionStorage so it survives
 * tab switches, component remounts and accidental drawer closes.
 *
 * Pass a stable `key`. Pass `enabled=false` to disable persistence
 * (e.g. once the form was successfully submitted, you can clear it).
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
  opts: { storage?: "session" | "local" } = {},
): [T, (v: T | ((prev: T) => T)) => void, () => void] {
  const storage = typeof window === "undefined"
    ? null
    : opts.storage === "local" ? window.localStorage : window.sessionStorage;

  const initialRef = useRef(initial);
  const [value, setValue] = useState<T>(() => {
    if (!storage) return initial;
    try {
      const raw = storage.getItem(key);
      if (raw == null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota / circular — ignore */
    }
  }, [key, value, storage]);

  const clear = useCallback(() => {
    if (!storage) return;
    try { storage.removeItem(key); } catch { /* ignore */ }
    setValue(initialRef.current);
  }, [key, storage]);

  return [value, setValue, clear];
}
