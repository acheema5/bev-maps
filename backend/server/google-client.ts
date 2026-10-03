import type { LatLng, WalkingRoute } from "shared/contract";

// Thin wrapper around the Google Maps Platform HTTP APIs we need:
// Places API (New) `searchNearby`, and Routes API `computeRouteMatrix` /
// `computeRoutes`. Every `fetch` call in find-bev.ts and route.ts goes
// through this file, so tests can mock `global.fetch` once here instead
// of reimplementing request-building per test.

const PLACES_SEARCH_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
const ROUTES_MATRIX_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";
const ROUTES_COMPUTE_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

// The grab-and-go place types VISION.md scopes v1 to: convenience stores
// and supermarkets, not pharmacies/gas stations/cafes/liquor stores.
export const INCLUDED_PLACE_TYPES = ["convenience_store", "supermarket"];

export type PlaceCandidate = {
  placeId: string;
  name: string;
  kind: string;
  location: LatLng;
  openNow: boolean;
  closesAt?: string; // ISO 8601, from currentOpeningHours.nextCloseTime
};

function assertApiOk(res: Response, label: string): void {
  if (!res.ok) {
    throw new Error(`${label} failed: ${res.status} ${res.statusText}`);
  }
}

/**
 * Places API (New) searchNearby. Field mask is limited to the fields we
 * actually read, per VISION.md's "Cost" section.
 */
export async function searchNearby(
  apiKey: string,
  origin: LatLng,
  radiusM: number
): Promise<PlaceCandidate[]> {
  const res = await fetch(PLACES_SEARCH_NEARBY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.location,places.types,places.currentOpeningHours.openNow,places.currentOpeningHours.nextCloseTime",
    },
    body: JSON.stringify({
      includedTypes: INCLUDED_PLACE_TYPES,
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: origin.lat, longitude: origin.lng },
          radius: radiusM,
        },
      },
    }),
  });

  assertApiOk(res, "Places searchNearby");
  const data = await res.json();
  const places: unknown[] = Array.isArray(data?.places) ? data.places : [];

  return places.map((p: any): PlaceCandidate => {
    const types: string[] = Array.isArray(p.types) ? p.types : [];
    const kind = types.find((t) => INCLUDED_PLACE_TYPES.includes(t)) ?? types[0] ?? "unknown";
    return {
      placeId: p.id,
      name: p.displayName?.text ?? "Unknown",
      kind,
      location: { lat: p.location?.latitude, lng: p.location?.longitude },
      openNow: p.currentOpeningHours?.openNow === true,
      closesAt: p.currentOpeningHours?.nextCloseTime,
    };
  });
}

export type RouteMatrixEntry = {
  destinationIndex: number;
  distanceM: number;
  durationS: number;
};

/** Parses Google's duration strings, e.g. "123s" -> 123. */
function parseDurationSeconds(duration: unknown): number {
  if (typeof duration === "number") return duration;
  if (typeof duration === "string") {
    const match = duration.match(/^(\d+(?:\.\d+)?)s$/);
    if (match) return Number(match[1]);
  }
  throw new Error(`Unrecognized duration value: ${JSON.stringify(duration)}`);
}

/**
 * Routes API computeRouteMatrix for walking time from one origin to many
 * destinations in a single request. Field mask limited to what we use.
 */
export async function computeRouteMatrix(
  apiKey: string,
  origin: LatLng,
  destinations: LatLng[]
): Promise<RouteMatrixEntry[]> {
  const res = await fetch(ROUTES_MATRIX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,condition",
    },
    body: JSON.stringify({
      origins: [
        {
          waypoint: {
            location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
          },
        },
      ],
      destinations: destinations.map((d) => ({
        waypoint: { location: { latLng: { latitude: d.lat, longitude: d.lng } } },
      })),
      travelMode: "WALK",
    }),
  });

  assertApiOk(res, "Routes computeRouteMatrix");
  const data = await res.json();
  const rows: unknown[] = Array.isArray(data) ? data : [];

  return rows
    .filter((row: any) => row.condition === undefined || row.condition === "ROUTE_EXISTS")
    .map(
      (row: any): RouteMatrixEntry => ({
        destinationIndex: row.destinationIndex,
        distanceM: row.distanceMeters,
        durationS: parseDurationSeconds(row.duration),
      })
    );
}

/** Decodes a Google-encoded polyline into a list of lat/lng points. */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/**
 * Routes API computeRoutes for a single walking route. Field mask limited
 * to distance/duration/polyline.
 */
export async function computeRoutes(
  apiKey: string,
  origin: LatLng,
  destination: LatLng
): Promise<WalkingRoute> {
  const res = await fetch(ROUTES_COMPUTE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: {
        location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
      },
      travelMode: "WALK",
    }),
  });

  assertApiOk(res, "Routes computeRoutes");
  const data = await res.json();
  const route = data?.routes?.[0];
  if (!route) {
    throw new Error("computeRoutes returned no routes");
  }

  return {
    path: decodePolyline(route.polyline?.encodedPolyline ?? ""),
    distanceM: route.distanceMeters,
    durationS: parseDurationSeconds(route.duration),
  };
}

/** Great-circle distance between two points, in meters. */
export function haversineDistanceM(a: LatLng, b: LatLng): number {
  const EARTH_RADIUS_M = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}
