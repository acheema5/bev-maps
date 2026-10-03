import { describe, expect, it } from "vitest";
import { MAX_SPOTS, fogMask, prepareSpots } from "./fog-mask";
import { worldPx, zoomFor } from "./projection";

const here = { lat: 40.7553, lng: -73.9563 };
const zoom = zoomFor(here.lat, 150, 150);
const cam = { center: worldPx(here, zoom), headingDeg: 0, size: 150 };
const metersNorth = (m: number) => ({ lat: here.lat + m / 111_320, lng: here.lng });

describe("fog mask", () => {
  it("is fully fogged with nothing explored (never 'none')", () => {
    expect(fogMask(prepareSpots([], here, zoom), null, cam, 15)).toBe("linear-gradient(transparent, transparent)");
  });

  it("always reveals around you", () => {
    const mask = fogMask(prepareSpots([], here, zoom), worldPx(here, zoom), cam, 15);
    // Solid to 13.5 px, fading out by 16.5 px: the edge sits at the 15 px reveal radius.
    expect(mask).toBe("radial-gradient(circle 16.5px at 75.0px 75.0px, #000 13.5px, transparent 16.5px)");
  });

  it("merges points within the same grid cell", () => {
    const spots = prepareSpots([metersNorth(0), metersNorth(1), metersNorth(2), metersNorth(30)], here, zoom);
    expect(spots.world.length).toBe(2);
  });

  it("caps the number of spots, keeping the nearest", () => {
    const far = Array.from({ length: 400 }, (_, i) => metersNorth(10 + i * 6));
    const spots = prepareSpots(far, here, zoom);
    expect(spots.world.length).toBe(MAX_SPOTS);
    // The nearest point (10 m north) survived the cap.
    const nearest = worldPx(metersNorth(10), zoom);
    expect(spots.world.some((w) => Math.abs(w.y - nearest.y) < 0.5)).toBe(true);
  });

  it("skips spots that are off the minimap", () => {
    const spots = prepareSpots([metersNorth(30), metersNorth(500)], here, zoom);
    const layers = fogMask(spots, null, cam, 15).split("radial-gradient").length - 1;
    expect(layers).toBe(1);
  });
});
