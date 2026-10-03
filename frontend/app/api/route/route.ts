import { getRoute } from "backend-server";
import type { RouteRequest } from "shared/contract";

// Thin wrapper: JSON in → getRoute() → JSON out (reroutes). getRoute
// validates its input and never throws; all logic lives in backend/server.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RouteRequest;
  return Response.json(await getRoute(body));
}
