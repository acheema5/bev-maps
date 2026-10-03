import type { FindBevRequest, FindBevResponse } from "shared/contract";

// Server-only. Holds Google Maps Platform keys — never import this from
// frontend/ client code. Wired into frontend/app/api/find-bev by the
// integration agent. See VISION.md > "How a bev gets found".
//
// 1. Gather: Places API (New) nearby search for convenience stores,
//    supermarkets, etc. within ~15 min walk (~1.2km), widening if empty.
// 2. Filter: open now, and open on arrival (skip stores closing before
//    the walk would land, plus a buffer).
// 3. Shortlist the nearest ~5 by straight-line distance.
// 4. Rank: Routes API computeRouteMatrix for walking times to the
//    shortlist, pick the shortest walk.
// 5. Route: Routes API computeRoutes for the winning store.
export async function findBev(
  request: FindBevRequest
): Promise<FindBevResponse> {
  throw new Error("not implemented");
}
