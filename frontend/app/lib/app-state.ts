import type { Destination, FindBevResponse, WalkingRoute } from "shared/contract";

// The whole app is one screen that changes state (VISION → The flow). No
// route changes between steps: Home Screen web apps have dropped camera
// access when the page navigates.
//
//   home ─FIND→ finding ─FOUND→ found ─START→ starting ─STARTED→ navigating ─ARRIVED→ arrived
//                  └─(no fix, none nearby, error)→ notice ─FIND→ finding
//   EXIT from anywhere → home

export type NoticeKind =
  | "location-denied" // the user said no to location
  | "precise-off" // fixes are city-sized: Precise Location is off
  | "no-fix" // no usable GPS fix in time
  | "none-nearby" // NONE_NEARBY
  | "network"; // ERROR, timeout, or the request never landed

export type CameraStatus = "live" | "denied";
// pending: waiting for the first trustworthy reading. denied: the user said
// no (iOS remembers that until the app is relaunched). unavailable: allowed,
// but no usable reading arrived (no compass, or stuck uncalibrated).
export type CompassStatus = "pending" | "ok" | "denied" | "unavailable";

type Trip = { destination: Destination; route: WalkingRoute };

export type AppState =
  | { screen: "home" }
  | { screen: "finding"; attempt: number }
  | ({ screen: "found" } & Trip)
  | ({ screen: "starting" } & Trip)
  | ({ screen: "navigating"; camera: CameraStatus; compass: CompassStatus } & Trip)
  | ({ screen: "arrived" } & Trip)
  | { screen: "notice"; notice: NoticeKind };

export type AppEvent =
  | { type: "FIND"; attempt: number } // tap Find Bev, or Try again; attempt is a fresh id
  | { type: "LOCATION_FAILED"; attempt: number; notice: "location-denied" | "precise-off" | "no-fix" }
  | { type: "FIND_RESULT"; attempt: number; response: FindBevResponse }
  | { type: "FIND_FAILED"; attempt: number } // timeout or network
  | { type: "START" } // tap Enable camera
  | { type: "STARTED"; camera: CameraStatus; compass: CompassStatus }
  | { type: "CAMERA"; camera: CameraStatus }
  | { type: "COMPASS"; compass: CompassStatus }
  | { type: "ROUTE_UPDATED"; route: WalkingRoute } // reroute landed
  | { type: "ARRIVED" }
  | { type: "EXIT" } // × while navigating, Done on arrival
  | { type: "DEBUG_SET"; state: AppState }; // ?debug=1 jumps

export const initialState: AppState = { screen: "home" };

export function appReducer(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case "FIND":
      if (state.screen !== "home" && state.screen !== "notice") return state;
      return { screen: "finding", attempt: event.attempt };

    case "LOCATION_FAILED":
      if (!isAttempt(state, event.attempt)) return state;
      return { screen: "notice", notice: event.notice };

    case "FIND_RESULT":
      if (!isAttempt(state, event.attempt)) return state;
      return stateForResult(event.response);

    case "FIND_FAILED":
      if (!isAttempt(state, event.attempt)) return state;
      return { screen: "notice", notice: "network" };

    case "START":
      if (state.screen !== "found") return state;
      return { ...state, screen: "starting" };

    case "STARTED":
      if (state.screen !== "starting") return state;
      return {
        screen: "navigating",
        destination: state.destination,
        route: state.route,
        camera: event.camera,
        compass: event.compass,
      };

    case "CAMERA":
      if (state.screen !== "navigating") return state;
      return { ...state, camera: event.camera };

    case "COMPASS":
      if (state.screen !== "navigating") return state;
      return { ...state, compass: event.compass };

    case "ROUTE_UPDATED":
      if (state.screen !== "navigating" || !isUsableRoute(event.route)) return state;
      return { ...state, route: event.route };

    case "ARRIVED":
      if (state.screen !== "navigating") return state;
      return { screen: "arrived", destination: state.destination, route: state.route };

    case "EXIT":
      return initialState;

    case "DEBUG_SET":
      return event.state;
  }
}

// Every variant of FindBevResponse maps to a screen. ERROR's `message` is for
// developers; users only ever see the calm notice copy.
function stateForResult(response: FindBevResponse): AppState {
  switch (response.status) {
    case "FOUND":
      // guide() can't steer along fewer than two points; treat it as a failure.
      if (!isUsableRoute(response.route)) return { screen: "notice", notice: "network" };
      return { screen: "found", destination: response.destination, route: response.route };
    case "NONE_NEARBY":
      return { screen: "notice", notice: "none-nearby" };
    case "ERROR":
      return { screen: "notice", notice: "network" };
  }
}

export function isUsableRoute(route: WalkingRoute): boolean {
  return route.path.length >= 2;
}

// Async results carry the attempt they belong to, so a late answer from an
// abandoned search can never yank the screen somewhere else.
function isAttempt(state: AppState, attempt: number): boolean {
  return state.screen === "finding" && state.attempt === attempt;
}

/** "7-Eleven · 4 min": walking time rounded to whole minutes, never 0. */
export function foundLine(destination: Destination, route: WalkingRoute): string {
  const minutes = Math.max(1, Math.round(route.durationS / 60));
  return `${destination.name} · ${minutes} min`;
}
