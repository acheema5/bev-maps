import type { RouteRequest, RouteResponse } from "shared/contract";

// Server-only. Reroute when the user strays off path. Throttled by the
// caller to at most once every ~15s. See VISION.md > "Off route".
export async function getRoute(request: RouteRequest): Promise<RouteResponse> {
  throw new Error("not implemented");
}
