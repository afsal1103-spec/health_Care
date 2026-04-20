"use client";

type CacheEnvelope<T> = {
  ts: number;
  value: T;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function getCachedValue<T>(key: string, maxAgeMs: number): T | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > maxAgeMs) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

export function setCachedValue<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  try {
    const payload: CacheEnvelope<T> = { ts: Date.now(), value };
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // no-op
  }
}
