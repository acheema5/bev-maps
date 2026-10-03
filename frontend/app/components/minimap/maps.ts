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
let failed = false;
const failureListeners = new Set<() => void>();

function fail() {
  failed = true;
  for (const listener of failureListeners) listener();
}

export function mapsFailed(): boolean {
  return failed;
}

/** Called if Google rejects the key (wrong referrer, billing, disabled API) or the script won't load. */
export function onMapsFailure(listener: () => void): () => void {
  if (failed) listener();
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

function configure() {
  if (configured || !hasTiles) return;
  configured = true;
  // Google calls this global when the key is refused; its map then shows an error panel.
  (window as Window & { gm_authFailure?: () => void }).gm_authFailure = fail;
  setOptions({ key: KEY, v: "weekly", mapIds: [MAP_ID!] });
}

/** Start downloading the Maps JavaScript API early (on the Found screen). */
export function prefetchMaps(): void {
  if (!hasTiles || failed) return;
  configure();
  importLibrary("maps").catch(() => {});
}

/**
 * The two maps, created on first use INSIDE the given on-screen, sized hosts:
 * Google's vector (rotatable) renderer fails on a detached, zero-size element
 * and silently falls back to raster, which can't turn heading-up.
 */
export function getMinimapMaps(
  center: LatLng,
  zoom: number,
  hosts: { dark: HTMLElement; light: HTMLElement },
): Promise<MinimapMaps | null> {
  if (!hasTiles) return Promise.resolve(null);
  configure();
  created ??= (async () => {
    const [{ Map, RenderingType }, { ColorScheme }] = await Promise.all([importLibrary("maps"), importLibrary("core")]);
    const make = (colorScheme: google.maps.ColorScheme, host: HTMLElement) => {
      const el = document.createElement("div");
      el.style.cssText = "position:absolute;inset:0;";
      host.appendChild(el);
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
    const dark = make(ColorScheme.DARK, hosts.dark);
    const light = make(ColorScheme.LIGHT, hosts.light);
    return {
      dark: dark.map,
      light: light.map,
      darkEl: dark.el,
      lightEl: light.el,
      // UNINITIALIZED counts as rotating, so the map doesn't flash north-up while it starts.
      canRotate: () => dark.map.getRenderingType() !== RenderingType.RASTER,
    };
  })().catch(() => {
    fail();
    return null;
  });
  return created;
}
