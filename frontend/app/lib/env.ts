// What kind of device and session this is. Read once, after mount: none of
// this exists during prerender, and reading `window.location` in an effect
// avoids useSearchParams' Suspense requirement on a static page.

export type FixtureVariant = "found" | "none" | "error" | "slow";

export type Flags = {
  sim: boolean; // ?sim=1: simulated walk along the fixture route
  debug: boolean; // ?debug=1: debug panel, desktop allowed
  fixture: FixtureVariant | null; // ?fixture=…: force a canned /api response
  live: boolean; // ?live=1: real /api calls in a development build
};

export type Device = {
  isIOS: boolean;
  isPhone: boolean;
  isStandalone: boolean; // launched from the Home Screen
};

const FIXTURE_VARIANTS: readonly FixtureVariant[] = ["found", "none", "error", "slow"];

export function readFlags(search: string): Flags {
  const params = new URLSearchParams(search);
  const fixture = params.get("fixture");
  return {
    sim: params.get("sim") === "1",
    debug: params.get("debug") === "1",
    fixture: FIXTURE_VARIANTS.includes(fixture as FixtureVariant)
      ? (fixture as FixtureVariant)
      : null,
    live: params.get("live") === "1",
  };
}

export function detectDevice(): Device {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; a touch-capable "Mac" is an iPad.
  const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isIPhone = /iPhone|iPod/.test(ua);
  const isAndroidPhone = /Android.+Mobile/.test(ua);
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const shortSide = Math.min(window.screen.width, window.screen.height);

  const isStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches;

  return {
    isIOS: isIPhone || isIPad,
    isPhone: isIPhone || isAndroidPhone || (coarse && !isIPad && shortSide <= 500),
    isStandalone,
  };
}
