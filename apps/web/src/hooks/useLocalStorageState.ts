import { useEffect, useState } from "react";

export function useLocalStorageState<T>(key: string, initialValue: T, syncDeps: unknown[] = []) {
  const readValue = () => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  };

  const [value, setValue] = useState<T>(() => readValue());

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [key, value]);

  useEffect(() => {
    setValue(readValue());
  }, [key, ...syncDeps]);

  useEffect(() => {
    const syncValue = () => setValue(readValue());
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) syncValue();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncValue();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", syncValue);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", syncValue);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [key]);

  return [value, setValue] as const;
}

