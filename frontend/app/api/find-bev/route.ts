import { findBev } from "backend-server";
import type { FindBevRequest } from "shared/contract";

// Thin wrapper: JSON in → findBev() → JSON out. findBev validates its input
// and never throws; all logic lives in backend/server.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as FindBevRequest;
  return Response.json(await findBev(body));
}
