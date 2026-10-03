import type { RouteRequest, RouteResponse } from "shared/contract";
import { computeRoutes } from "./google-client";

// Server-only. Reroute when the user strays off path. Throttled by the
// caller to at most once every ~15s. See VISION.md > "Off route".
export async function getRoute(request: RouteRequest): Promise<RouteResponse> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!apiKey) {
      return { status: "ERROR", message: "GOOGLE_MAPS_SERVER_KEY is not configured" };
    }

    const route = await computeRoutes(apiKey, request.origin, request.destination);
    return { status: "OK", route };
  } catch (err) {
    return { status: "ERROR", message: err instanceof Error ? err.message : String(err) };
  }
}
