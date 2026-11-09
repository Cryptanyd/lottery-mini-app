"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError } from "@/lib/types";

export class ApiClientError extends Error {
  constructor(
    public code: ApiError["code"] | "network",
    message: string,
    public hint?: string,
  ) {
    super(message);
  }
}

export async function apiGet<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiClientError("network", "Network error — check your connection");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiClientError(body?.code ?? "upstream", body?.error ?? `Request failed (${res.status})`, body?.hint);
  }
  return body as T;
}

/** Minimal SWR-like hook: loading / error / data + manual refresh. */
export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [loading, setLoading] = useState(!!url);
  const ctrl = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!url) return;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setLoading(true);
    setError(null);
    try {
      const d = await apiGet<T>(url, c.signal);
      if (!c.signal.aborted) setData(d);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      if (!c.signal.aborted) setError(e instanceof ApiClientError ? e : new ApiClientError("upstream", String(e)));
    } finally {
      if (!c.signal.aborted) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    setData(null);
    load();
    return () => ctrl.current?.abort();
  }, [load]);

  return { data, error, loading, reload: load };
}
