import { SERVER_RPC_URL } from "@/lib/config";
import { HttpError } from "./http";

/**
 * Minimal JSON-RPC client. We deliberately avoid web3.js on the server for
 * speed and bundle size; the handful of methods we need are trivial.
 */
let id = 0;

export class RpcError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

export async function rpc<T>(method: string, params: unknown[], timeoutMs = 10_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(SERVER_RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (res.status === 429) throw new HttpError(429, "RPC rate limited");
    if (!res.ok) throw new HttpError(res.status, `RPC responded ${res.status}`);
    const json = (await res.json()) as { result?: T; error?: { code: number; message: string } };
    if (json.error) throw new RpcError(json.error.code, json.error.message);
    return json.result as T;
  } finally {
    clearTimeout(timer);
  }
}

export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const SYSTEM_PROGRAM = "11111111111111111111111111111111";
export const WSOL_MINT = "So11111111111111111111111111111111111111112";

export interface ParsedAccount<T = unknown> {
  owner: string;
  lamports: number;
  executable: boolean;
  data: { parsed?: { type: string; info: T }; program?: string } | [string, string];
}

export interface RpcValue<T> {
  context: { slot: number };
  value: T;
}
