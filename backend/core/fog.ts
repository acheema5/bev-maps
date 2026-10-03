import type { LatLng } from "shared/contract";

// Fog of war. See VISION.md > "Fog of war rendering".
// Save a point whenever the user moved >=5m and accuracyM <= 30.
// Revealed area = union of 15m circles around saved points. Persist on
// the phone (localStorage to start, IndexedDB if it grows).

const STORAGE_KEY = "bev-maps:fog-points";

// Minimum distance (meters) the user must move from the last saved point
// before a new point is recorded.
const MIN_MOVE_M = 5;

// Fixes less accurate than this (meters) are dropped.
const MAX_ACCURACY_M = 30;

// Radius (meters) of the revealed circle around each saved point. Exported
// so the frontend doesn't need to hardcode this number again.
export const REVEAL_RADIUS_M = 15;

// In-memory cache, lazily hydrated from localStorage on first access, kept
// in sync (write-through) on every recordPosition call. `undefined` means
// "not yet loaded from storage".
let cache: LatLng[] | undefined;

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadPoints(): LatLng[] {
  if (cache !== undefined) return cache;

  if (!hasLocalStorage()) {
    cache = [];
    return cache;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cache = [];
      return cache;
    }
    const parsed = JSON.parse(raw);
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }

  return cache;
}

// Small local geo-distance helper (haversine), kept self-contained so this
// file has zero shared dependencies beyond the LatLng type.
function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371000; // Earth radius, meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function recordPosition(position: LatLng, accuracyM: number): void {
  if (accuracyM > MAX_ACCURACY_M) return;

  // No persistence available at all: no-op rather than tracking points
  // in memory only, so behavior stays consistent with revealedPoints().
  if (!hasLocalStorage()) return;

  try {
    const points = loadPoints();
    const last = points[points.length - 1];

    if (last && distanceM(last, position) < MIN_MOVE_M) return;

    const next = [...points, position];
    // Write first: if persistence fails (quota, blocked storage), leave
    // the in-memory cache untouched so revealedPoints() doesn't report a
    // point that didn't actually get saved.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    cache = next;
  } catch {
    // Never throw from here — fog tracking is best-effort.
  }
}

export function revealedPoints(): LatLng[] {
  try {
    return loadPoints();
  } catch {
    return [];
  }
}
