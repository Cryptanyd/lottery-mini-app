/** fetch with timeout + JSON parsing. Throws on non-2xx. */
export async function fetchJson<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 8000, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      signal: ctrl.signal,
      headers: { accept: "application/json", "user-agent": "ScanX/0.1", ...(rest.headers ?? {}) },
      cache: "no-store",
    });
    if (!res.ok) throw new HttpError(res.status, `${new URL(url).host} responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Resolve a promise to a fallback instead of throwing; records a warning. */
export async function soft<T>(p: Promise<T>, fallback: T, warnings: string[], label: string): Promise<T> {
  try {
    return await p;
  } catch (e) {
    warnings.push(`${label}: ${e instanceof Error ? e.message : "failed"}`);
    return fallback;
  }
}
