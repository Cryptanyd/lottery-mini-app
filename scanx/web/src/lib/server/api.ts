import { NextResponse, type NextRequest } from "next/server";
import type { ApiError } from "@/lib/types";
import { HttpError } from "./http";
import { rateLimit } from "./cache";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function json<T>(data: T, init: { status?: number; maxAge?: number } = {}) {
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": init.maxAge
        ? `public, s-maxage=${init.maxAge}, stale-while-revalidate=${init.maxAge * 4}`
        : "no-store",
    },
  });
}

export function apiError(code: ApiError["code"], error: string, status: number, extra: Record<string, unknown> = {}) {
  return json<ApiError & Record<string, unknown>>({ error, code, ...extra }, { status });
}

export function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
}

/** Returns an error response if the caller exceeded the limit, otherwise null. */
export function limitOr429(req: NextRequest, bucket: string, perMinute: number) {
  if (rateLimit(`${bucket}:${clientIp(req)}`, perMinute, 60_000)) return null;
  return apiError("rate_limited", "Too many requests — slow down a bit", 429);
}

export function upstreamError(e: unknown) {
  if (e instanceof HttpError && e.status === 429) {
    return apiError("rate_limited", "Upstream RPC is rate-limiting. Try again in a few seconds.", 503);
  }
  console.error("[scanx] upstream error", e);
  return apiError("upstream", "Failed to fetch on-chain data. Please retry.", 502);
}

export function preflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
