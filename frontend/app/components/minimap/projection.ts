import type { LatLng } from "shared/contract";

// Web Mercator, the same math Google uses, so overlays and fog holes land
// exactly where the map draws things. Pixels are CSS px; at zoom z the world
// is 256 · 2^z px wide.

const TILE = 256;

/** World pixel coordinates at `zoom`: x east, y south. */
export function worldPx(p: LatLng, zoom: number): { x: number; y: number } {
  const scale = TILE * 2 ** zoom;
  const sin = Math.min(Math.max(Math.sin((p.lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((p.lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

export function metersPerPx(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}

/** The zoom at which `spanM` meters fill `sizePx` pixels (fractional; vector maps allow it). */
export function zoomFor(lat: number, spanM: number, sizePx: number): number {
  return Math.log2((156543.03392 * Math.cos((lat * Math.PI) / 180) * sizePx) / spanM);
}

export type Camera = { center: { x: number; y: number }; headingDeg: number; size: number };

/**
 * World px → minimap px. The map turns so `headingDeg` points up (heading-up,
 * like the camera view): rotate the offset by -heading.
 */
export function toScreen(world: { x: number; y: number }, cam: Camera): { x: number; y: number } {
  const dx = world.x - cam.center.x;
  const dy = world.y - cam.center.y;
  const r = (cam.headingDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return {
    x: cam.size / 2 + dx * cos + dy * sin,
    y: cam.size / 2 - dx * sin + dy * cos,
  };
}
