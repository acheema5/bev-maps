import type { Destination, FindBevRequest, FindBevResponse } from "shared/contract";
import {
  computeRouteMatrix,
  computeRoutes,
  haversineDistanceM,
  searchNearby,
  type PlaceCandidate,
} from "./google-client";

// Server-only. Holds Google Maps Platform keys — never import this from
// frontend/ client code. The frontend owner writes a thin
// frontend/app/api/find-bev route that calls findBev() directly.
// See VISION.md > "How a bev gets found".

// Start at about a 15-minute walk, doubling up to a ~3km cap before
// giving up (VISION.md "Walking range").
const START_RADIUS_M = 1200;
const RADIUS_CAP_M = 3000;

// Shortlist size for the walking-time ranking step.
const SHORTLIST_SIZE = 5;

// Don't send a candidate that closes within this many minutes of our
// estimated arrival.
const CLOSING_BUFFER_S = 5 * 60;

export async function findBev(request: FindBevRequest): Promise<FindBevResponse> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!apiKey) {
      return { status: "ERROR", message: "GOOGLE_MAPS_SERVER_KEY is not configured" };
    }

    let radiusM = START_RADIUS_M;
    let lastRadiusSearched = radiusM;

    while (true) {
      lastRadiusSearched = radiusM;

      const candidates = await searchNearby(apiKey, request.origin, radiusM);
      const openNow = candidates.filter((c) => c.openNow);

      if (openNow.length > 0) {
        const shortlist = nearestN(request.origin, openNow, SHORTLIST_SIZE);
        const winner = await pickOpenOnArrival(apiKey, request.origin, shortlist);

        if (winner) {
          const route = await computeRoutes(apiKey, request.origin, winner.location);
          const destination: Destination = {
            placeId: winner.placeId,
            name: winner.name,
            kind: winner.kind,
            location: winner.location,
            closesAt: winner.closesAt,
          };
          return { status: "FOUND", destination, route };
        }
      }

      if (radiusM >= RADIUS_CAP_M) break;
      radiusM = Math.min(radiusM * 2, RADIUS_CAP_M);
    }

    return { status: "NONE_NEARBY", searchedRadiusM: lastRadiusSearched };
  } catch (err) {
    return { status: "ERROR", message: err instanceof Error ? err.message : String(err) };
  }
}

function nearestN(
  origin: PlaceCandidate["location"],
  candidates: PlaceCandidate[],
  n: number
): PlaceCandidate[] {
  return [...candidates]
    .sort((a, b) => haversineDistanceM(origin, a.location) - haversineDistanceM(origin, b.location))
    .slice(0, n);
}

/**
 * Ranks the shortlist by walking time (shortest first) and returns the
 * first candidate that would still be open on arrival, or undefined if
 * none qualify.
 */
async function pickOpenOnArrival(
  apiKey: string,
  origin: PlaceCandidate["location"],
  shortlist: PlaceCandidate[]
): Promise<PlaceCandidate | undefined> {
  if (shortlist.length === 0) return undefined;

  const matrix = await computeRouteMatrix(
    apiKey,
    origin,
    shortlist.map((c) => c.location)
  );
  const durationByIndex = new Map(matrix.map((m) => [m.destinationIndex, m.durationS]));

  const ranked = shortlist
    .map((candidate, index) => ({ candidate, durationS: durationByIndex.get(index) }))
    .filter((entry): entry is { candidate: PlaceCandidate; durationS: number } => entry.durationS !== undefined)
    .sort((a, b) => a.durationS - b.durationS);

  const now = Date.now();
  for (const { candidate, durationS } of ranked) {
    if (candidate.closesAt) {
      const closesAtMs = new Date(candidate.closesAt).getTime();
      const arrivalMs = now + durationS * 1000 + CLOSING_BUFFER_S * 1000;
      if (arrivalMs > closesAtMs) continue;
    }
    return candidate;
  }

  return undefined;
}
