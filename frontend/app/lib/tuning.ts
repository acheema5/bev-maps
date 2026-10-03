// Every number the frontend tunes on a real sidewalk lives here.
// Units are in the name: M = meters, MS = milliseconds, DEG = degrees, PT = CSS px.

// Finding Bev: getting a usable GPS fix (VISION → 2. Finding Bev, Edge states).
export const GOOD_FIX_M = 50; // start searching as soon as accuracy is this good
export const FIX_WAIT_MS = 8_000; // after this, settle for the best fix within FALLBACK_FIX_M
export const FALLBACK_FIX_M = 100;
export const FIX_GIVE_UP_MS = 15_000; // then use the best fix within GIVE_UP_FIX_M, or give up
export const GIVE_UP_FIX_M = 500; // a rough start is fine: reroutes correct it as GPS settles
export const PRECISE_OFF_M = 1_000; // every fix this rough after FIX_WAIT_MS → Precise Location is off

// Finding Bev: the request.
export const MIN_SHIMMER_MS = 800; // never flash the shimmer
export const FIND_TIMEOUT_MS = 12_000; // server worst case is ~9 s plus a cold start
export const ROUTE_TIMEOUT_MS = 10_000;

// Navigate: rerouting. guide() reports offRoute instantly; timing is ours.
export const OFF_ROUTE_DWELL_MS = 5_000;
export const REROUTE_MIN_INTERVAL_MS = 15_000;

// Navigate: heading.
export const HEADING_TAU_MS = 200; // low-pass time constant for the compass
export const COMPASS_WAIT_MS = 5_000; // no trustworthy reading by now → compass "unavailable"
export const GUIDE_MIN_INTERVAL_MS = 100; // re-run guide() on heading ticks at most 10×/s
export const HOLD_UP_SHOW_DEG = 40; // phone pitch (beta) below this → "Hold your phone up"
export const HOLD_UP_HIDE_DEG = 50; // …and back above this hides it

// Minimap.
export const MINIMAP_PT = 150;
export const MINIMAP_SPAN_M = 150; // the minimap shows about this many meters across
export const POSITION_LERP_MS = 800; // glide between ~1 Hz GPS fixes
