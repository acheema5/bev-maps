import type { LatLng } from "shared/contract";
import { toScreen, worldPx, type Camera } from "./projection";

// Fog of war (VISION → 5. The minimap): the dark map is everywhere; the
// colored map shows through 15 m circles around everywhere you've been.
// This builds the colored layer's CSS mask: one soft radial-gradient per
// explored spot. Gradients are synchronous (no image decode), so the mask
// never flashes, and stacking them unions the circles.

export const GRID_M = 8; // 15 m circles this close still overlap seamlessly
export const MAX_SPOTS = 250; // cap the candidates; only on-screen ones become layers

export type FogSpots = {
  source: readonly LatLng[]; // the revealedPoints() array these came from
  zoom: number;
  world: { x: number; y: number }[];
};

/**
 * Projects explored points once per new revealedPoints() array (it only
 * changes when a point is saved). Points are bucketed to a 5 m grid, then
 * the MAX_SPOTS nearest to `near` are kept: repeat walks down the same
 * street would otherwise pile up hundreds of layers.
 */
export function prepareSpots(points: readonly LatLng[], near: LatLng, zoom: number): FogSpots {
  const cosLat = Math.cos((near.lat * Math.PI) / 180);
  const seen = new Map<string, LatLng>();
  for (const p of points) {
    const gx = Math.round(((p.lng - near.lng) * 111_320 * cosLat) / GRID_M);
    const gy = Math.round(((p.lat - near.lat) * 111_320) / GRID_M);
    seen.set(`${gx},${gy}`, p);
  }
  const unique = [...seen.values()];
  const distSq = (p: LatLng) => ((p.lng - near.lng) * cosLat) ** 2 + (p.lat - near.lat) ** 2;
  if (unique.length > MAX_SPOTS) unique.sort((a, b) => distSq(a) - distSq(b)).length = MAX_SPOTS;
  return { source: points, zoom, world: unique.map((p) => worldPx(p, zoom)) };
}

/**
 * The mask-image value for this frame. `you` is always revealed, so the area
 * around you lights up before the first point is saved. Spots off-screen
 * are skipped. Never returns "none" (that would mean fully visible).
 */
export function fogMask(spots: FogSpots, you: { x: number; y: number } | null, cam: Camera, radiusPx: number): string {
  // A 3 px soft edge centered on the reveal radius, so 15 m reads as the edge.
  const r = Math.max(2, radiusPx) + 1.5;
  const soft = Math.max(1, r - 3);
  const layers: string[] = [];
  const add = (w: { x: number; y: number }) => {
    const s = toScreen(w, cam);
    if (s.x < -r || s.y < -r || s.x > cam.size + r || s.y > cam.size + r) return;
    layers.push(
      `radial-gradient(circle ${r.toFixed(1)}px at ${s.x.toFixed(1)}px ${s.y.toFixed(1)}px, #000 ${soft.toFixed(1)}px, transparent ${r.toFixed(1)}px)`,
    );
  };
  if (you) add(you);
  for (const w of spots.world) add(w);
  return layers.length > 0 ? layers.join(", ") : "linear-gradient(transparent, transparent)";
}
