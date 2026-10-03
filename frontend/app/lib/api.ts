import type { FindBevRequest, FindBevResponse, RouteRequest, RouteResponse } from "shared/contract";
import { findBevError, findBevFound, findBevNoneNearby, rerouteOk } from "shared/fixtures";
import type { Flags } from "./env";
import { FIND_TIMEOUT_MS, ROUTE_TIMEOUT_MS } from "./tuning";

// The ONE switch between canned answers and the real backend.
// - ?fixture=… or ?sim=1 → fixtures, in any build (the sim walks the fixture route).
// - Development builds → fixtures unless ?live=1: every live tap bills a Places search.
// - Production (including Vercel previews) → live.
export type ApiSource = "live" | "fixtures";

export function apiSource(flags: Flags, nodeEnv = process.env.NODE_ENV): ApiSource {
  if (flags.fixture || flags.sim) return "fixtures";
  if (nodeEnv === "development" && !flags.live) return "fixtures";
  return "live";
}

type CallOptions = { flags: Flags; signal?: AbortSignal; timeoutMs?: number };

// Never throws. Timeouts, network failures, and bad responses all come back
// as ERROR, which the app shows as "Couldn't reach Bev."
export async function requestBev(request: FindBevRequest, options: CallOptions): Promise<FindBevResponse> {
  if (apiSource(options.flags) === "fixtures") {
    const variant = options.flags.fixture ?? "found";
    await sleep(variant === "slow" ? 4_000 : 600 + Math.random() * 600, options.signal);
    if (variant === "none") return findBevNoneNearby;
    if (variant === "error") return findBevError;
    return findBevFound;
  }
  return post<FindBevResponse>("/api/find-bev", request, FIND_STATUSES, options.signal, options.timeoutMs ?? FIND_TIMEOUT_MS);
}

export async function requestRoute(request: RouteRequest, options: CallOptions): Promise<RouteResponse> {
  if (apiSource(options.flags) === "fixtures") {
    await sleep(300, options.signal);
    return rerouteOk;
  }
  return post<RouteResponse>("/api/route", request, ROUTE_STATUSES, options.signal, options.timeoutMs ?? ROUTE_TIMEOUT_MS);
}

// Only statuses the contract knows reach the app; anything else is an ERROR.
const FIND_STATUSES: readonly FindBevResponse["status"][] = ["FOUND", "NONE_NEARBY", "ERROR"];
const ROUTE_STATUSES: readonly RouteResponse["status"][] = ["OK", "ERROR"];

async function post<T extends { status: string }>(
  url: string,
  body: unknown,
  statuses: readonly T["status"][],
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<T | { status: "ERROR"; message: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), timeoutMs);
  const forward = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", forward, { once: true });
  if (signal?.aborted) forward();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json: unknown = await response.json();
    const status = (json as { status?: unknown } | null)?.status;
    if (statuses.includes(status as T["status"])) return json as T;
    return { status: "ERROR", message: `${url}: unexpected response (${response.status})` };
  } catch (err) {
    return { status: "ERROR", message: `${url}: ${err instanceof Error ? err.name : String(err)}` };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forward);
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}
