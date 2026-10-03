import type { LatLng } from "shared/contract";

// Fog of war. See VISION.md > "Fog of war rendering".
// Save a point whenever the user moved >=5m and accuracyM <= 30.
// Revealed area = union of 15m circles around saved points. Persist on
// the phone (localStorage to start, IndexedDB if it grows).

export function recordPosition(position: LatLng, accuracyM: number): void {
  throw new Error("not implemented");
}

export function revealedPoints(): LatLng[] {
  throw new Error("not implemented");
}
