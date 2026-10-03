import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import type { LatLng } from "shared/contract";

// The two Google maps behind the minimap: Google's dark scheme everywhere,
// the normal colored map on top showing through the fog's holes (VISION →
// Fog of war rendering). A map's color scheme is fixed at creation, hence
// two. Both are created ONCE per app process and re-parented into whichever
// minimap is on screen: every `new google.maps.Map` is a billed map load.
//
// Without NEXT_PUBLIC_GOOGLE_MAPS_KEY and NEXT_PUBLIC_GOOGLE_MAP_ID (a vector
// Map ID with light and dark cloud styles, POIs and labels off) the minimap
// draws its own tile-less version instead.

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;

export const hasTiles = Boolean(KEY && MAP_ID);

export type MinimapMaps = {
  dark: google.maps.Map;
  light: google.maps.Map;
  darkEl: HTMLDivElement;
  lightEl: HTMLDivElement;
  /** Vector rendering can rotate; mobile vector support is "experimental" and may fall back to raster. */
  canRotate: () => boolean;
};

let configured = false;
let created: Promise<MinimapMaps | null> | null = null;

function configure() {
  if (configured || !hasTiles) return;
  configured = true;
  setOptions({ key: KEY, v: "weekly", mapIds: [MAP_ID!] });
}

/** Start downloading the Maps JavaScript API early (on the Found screen). */
export function prefetchMaps(): void {
  if (!hasTiles) return;
  configure();
  importLibrary("maps").catch(() => {});
}

export function getMinimapMaps(center: LatLng, zoom: number): Promise<MinimapMaps | null> {
  if (!hasTiles) return Promise.resolve(null);
  configure();
  created ??= (async () => {
    const [{ Map, RenderingType }, { ColorScheme }] = await Promise.all([importLibrary("maps"), importLibrary("core")]);
    const make = (colorScheme: google.maps.ColorScheme) => {
      const el = document.createElement("div");
      el.style.cssText = "position:absolute;inset:0;";
      const map = new Map(el, {
        mapId: MAP_ID,
        renderingType: RenderingType.VECTOR,
        colorScheme,
        center,
        zoom,
        heading: 0,
        tilt: 0,
        isFractionalZoomEnabled: true,
        disableDefaultUI: true,
        gestureHandling: "none",
        keyboardShortcuts: false,
        clickableIcons: false,
        headingInteractionEnabled: false,
        tiltInteractionEnabled: false,
      });
      return { el, map };
    };
    const dark = make(ColorScheme.DARK);
    const light = make(ColorScheme.LIGHT);
    return {
      dark: dark.map,
      light: light.map,
      darkEl: dark.el,
      lightEl: light.el,
      canRotate: () => dark.map.getRenderingType() === RenderingType.VECTOR,
    };
  })().catch(() => null);
  return created;
}
